/**
 * client/src/hooks/useSession.ts
 * Thin wrapper around useSessionStore with derived computed values.
 */

import { useMemo } from "react";
import { useSessionStore } from "@/store";
import { chunkPassageWithParagraphs, wpmToIntervalMs, readingProgress } from "@/lib/utils";

export function useSession() {
  const store = useSessionStore();

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

  return {
    ...store,
    chunks,
    paragraphStartChunkIndices,
    intervalMs,
    totalChunks: chunks.length,
    /** 0–100 reading progress percent */
    progressPercent: (currentChunkIndex: number) =>
      readingProgress(currentChunkIndex, chunks.length),
  };
}
