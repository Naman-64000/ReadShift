/**
 * client/src/components/session/ReadingEngine.tsx
 * Core reading engine — renders the passage with chunk highlighting, fading, and pacing guide.
 */

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReadingChunk } from "@/lib/utils";
import type { ColWidth } from "@/types";

interface ReadingEngineProps {
  chunks: ReadingChunk[];
  currentChunkIndex: number;
  fadingEnabled: boolean;
  guideEnabled: boolean;
  colWidth: ColWidth;
  fontSizePx: number;
  highlightIntensity: "none" | "subtle" | "moderate" | "intense";
  autoCenterScroll?: boolean;
  isPaused?: boolean;
}

const colWidthClass: Record<ColWidth, string> = {
  narrow: "max-w-[38rem]",
  medium: "max-w-[52rem]",
  wide:   "max-w-[65rem]",
};

export default function ReadingEngine({
  chunks,
  currentChunkIndex,
  fadingEnabled,
  guideEnabled,
  colWidth,
  fontSizePx,
  highlightIntensity,
  autoCenterScroll = true,
  isPaused = false,
}: ReadingEngineProps) {
  const activeChunkRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [guideTop, setGuideTop] = useState(0);
  const [fadedIndex, setFadedIndex] = useState(-1);

  // ── Pacing Guide Calculation ───────────────────────────────
  const updateGuidePosition = useCallback(() => {
    if (!guideEnabled || !activeChunkRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const chunkRect = activeChunkRef.current.getBoundingClientRect();
    
    // We compute the line position based on the actual rendered bottom of the chunk
    setGuideTop(chunkRect.bottom - containerRect.top + 4);
  }, [guideEnabled]);

  // Update on chunk change
  useEffect(() => {
    updateGuidePosition();
  }, [currentChunkIndex, updateGuidePosition]);

  // Update on resize (ResizeObserver)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(updateGuidePosition);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateGuidePosition]);

  // Scroll active chunk into view based on autoCenterScroll setting
  useEffect(() => {
    if (autoCenterScroll && activeChunkRef.current) {
      activeChunkRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [currentChunkIndex, autoCenterScroll]);

  // ── Fading Logic (1.5s Delay) ─────────────────────────────
  useEffect(() => {
    if (!fadingEnabled || isPaused) return;
    
    // When currentChunkIndex increases, wait 1.5s before fading the previous chunks
    const timer = setTimeout(() => {
      setFadedIndex(currentChunkIndex - 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentChunkIndex, fadingEnabled, isPaused]);

  const words = useMemo(
    () =>
      chunks.map((chunk, chunkIdx) => ({
        chunkIdx,
        words: chunk.words,
        isParagraphStart: chunk.isParagraphStart,
        isActive: chunkIdx === currentChunkIndex,
        isFaded: fadingEnabled && chunkIdx <= fadedIndex,
      })),
    [chunks, currentChunkIndex, fadingEnabled, fadedIndex]
  );

  const intensityClasses: Record<"none" | "subtle" | "moderate" | "intense", string> = {
    none: "",
    subtle: "bg-indigo-500/15 border-indigo-500/20 -inset-x-0.5 -inset-y-0",
    moderate: "bg-indigo-500/30 border-indigo-500/40 -inset-x-2 -inset-y-0.5",
    intense: "bg-indigo-500/60 border-indigo-500/80 -inset-x-3.5 -inset-y-1 shadow-[0_0_14px_rgba(99,102,241,0.5)]",
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Pacing guide */}
      {guideEnabled && currentChunkIndex > 0 && (
        <div
          className="absolute left-0 right-0 h-px bg-indigo-500/30 pointer-events-none z-10 transition-all duration-300 ease-out"
          style={{ top: guideTop }}
        />
      )}

      {/* Passage text */}
      <p
        className={cn(
          "mx-auto leading-[1.9] text-slate-300 relative select-none",
          colWidthClass[colWidth]
        )}
        style={{ fontSize: `${fontSizePx}px` }}
      >
        {words.map(({ chunkIdx, words: chunkWords, isParagraphStart, isActive }) => (
          <span key={chunkIdx}>
            {isParagraphStart && chunkIdx > 0 && <span className="block h-5" aria-hidden />}
            <span
              ref={isActive ? activeChunkRef : null}
              className={cn(
                "relative inline transition-colors duration-500",
                isActive && highlightIntensity !== "none" ? "text-white" : "text-slate-300"
              )}
            >
              {/* Highlight box behind active chunk */}
              {isActive && highlightIntensity !== "none" && (
                <motion.span
                  layoutId="highlight"
                  aria-hidden
                  className={cn("absolute rounded -z-10", intensityClasses[highlightIntensity])}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {chunkWords.join(" ")}
              {chunkIdx < chunks.length - 1 ? " " : ""}
            </span>
          </span>
        ))}
      </p>
    </div>
  );
}
