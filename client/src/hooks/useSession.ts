/**
 * client/src/hooks/useSession.ts
 * Thin wrapper around useSessionStore with derived computed values.
 */

import { useMemo } from "react";
import { useSessionStore, useUserStore } from "@/store";
import { chunkPassageWithParagraphs, wpmToIntervalMs, readingProgress, calculateLaapIntervalsMs } from "@/lib/utils";

export function useSession() {
  const store = useSessionStore();
  const preferences = useUserStore((s) => s.preferences);

  const chunks = useMemo(() => {
    if (!store.passage || !store.config) return [];
    return chunkPassageWithParagraphs(store.passage.passage.body, store.config.chunk_size);
  }, [store.passage, store.config]);

  const paragraphStartChunkIndices = useMemo(
    () => chunks.map((c, idx) => (idx > 0 && c.isParagraphStart ? idx : -1)).filter((idx) => idx >= 0),
    [chunks]
  );

  const intervalMs = useMemo(() => {
    if (!store.config) return 600;
    return wpmToIntervalMs(store.config.target_wpm, store.config.chunk_size);
  }, [store.config]);

  const isLaapActive = preferences?.laap_enabled ?? true;

  const laapIntervalsMs = useMemo(() => {
    if (!store.passage || !store.config || !isLaapActive) return [];
    // Pass paragraphStartChunkIndices so LAAP natively embeds paragraph pauses.
    // This prevents double-counting with extraDelayMsByNextChunk.
    return calculateLaapIntervalsMs(chunks, store.config.target_wpm, paragraphStartChunkIndices);
  }, [chunks, store.passage, store.config, isLaapActive, paragraphStartChunkIndices]);

  return {
    ...store,
    chunks,
    paragraphStartChunkIndices,
    intervalMs,
    isLaapActive,
    customChunkIntervalsMs: isLaapActive ? laapIntervalsMs : undefined,
    // When LAAP is active: paragraph pauses are already embedded in the LAAP intervals.
    // When linear mode: use the original 500ms extra-delay map for paragraph pauses.
    extraDelayMsByNextChunk: isLaapActive
      ? {}
      : Object.fromEntries(paragraphStartChunkIndices.map((idx) => [idx, 500])),
    totalChunks: chunks.length,
    /** 0–100 reading progress percent */
    progressPercent: (currentChunkIndex: number) =>
      readingProgress(currentChunkIndex, chunks.length),
  };
}

