/**
 * client/src/screens/ReadingScreen.tsx
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import ReadingEngine from "@/components/session/ReadingEngine";
import ProgressBar from "@/components/session/ProgressBar";
import { motion } from "framer-motion";
import { useUIStore } from "@/store";
import Button from "@/components/shared/Button";
import { msToTime, readingProgress } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function ReadingScreen() {
  const navigate = useNavigate();
  const { passage, config, chunks, paragraphStartChunkIndices, intervalMs, totalChunks, markReadingDone, resetSession, phase } = useSession();
  const { setFullscreen } = useUIStore();
  const [isReady, setIsReady] = useState(false);

  // Redirect if no active session
  useEffect(() => {
    if (phase !== "reading" || !passage) navigate("/session/config", { replace: true });
  }, [phase, passage, navigate]);

  // Enter fullscreen reading mode
  useEffect(() => {
    setFullscreen(true);
    return () => setFullscreen(false);
  }, [setFullscreen]);

  const handleComplete = (elapsedMs: number) => {
    markReadingDone(elapsedMs);
    navigate("/session/mcq");
  };

  const { currentChunkIndex, elapsedMs, isPaused, isRunning, start, pause, resume } =
    useReadingTimer({
      totalChunks,
      intervalMs,
      extraDelayMsByNextChunk: Object.fromEntries(paragraphStartChunkIndices.map((idx) => [idx, 500])),
      onComplete: handleComplete,
    });

  const handleBegin = () => {
    if (!isRunning && totalChunks > 0) start();
    setIsReady(true);
  };

  const handleBackToConfig = () => {
    resetSession();
    navigate("/session/config");
  };

  if (!passage || !config) return null;

  const progress = readingProgress(currentChunkIndex, totalChunks);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="fixed top-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur border-b border-white/8">
        <ProgressBar percent={progress} />
        <div className="flex items-center justify-between px-3 sm:px-6 h-11 gap-2">
          <button
            onClick={handleBackToConfig}
            className="text-xs font-semibold px-2 sm:px-3 py-1 rounded-lg transition-colors bg-white/8 text-slate-300 hover:text-white"
          >
            ← Back
          </button>
          <span className="text-xs text-slate-500 tabular-nums">{msToTime(elapsedMs)}</span>
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
            {config.target_wpm} WPM
          </span>
          <button
            onClick={isPaused ? resume : pause}
            disabled={!isReady}
            className={cn(
              "text-xs font-semibold px-2 sm:px-3 py-1 rounded-lg transition-colors whitespace-nowrap",
              isPaused
                ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                : "bg-white/8 text-slate-400 hover:text-white",
              !isReady && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      {/* Reading area */}
      <div className="flex-1 flex items-start justify-center pt-20 sm:pt-24 pb-16 px-3 sm:px-6 overflow-y-auto">
        <ReadingEngine
          chunks={chunks}
          currentChunkIndex={currentChunkIndex}
          fadingEnabled={config.fading_enabled}
          guideEnabled={config.guide_enabled}
          colWidth={config.fading_enabled ? "medium" : "medium"}
          fontSizePx={18}
        />
      </div>

      {/* Done Button — only appears after 50% progress */}
      {progress >= 50 && !isRunning && (
        <div className="fixed bottom-10 inset-x-0 flex justify-center z-40">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button size="lg" className="shadow-2xl shadow-indigo-500/20" onClick={() => handleComplete(elapsedMs)}>
              I'm Done Reading →
            </Button>
          </motion.div>
        </div>
      )}

      {/* Paused overlay */}
      {!isReady && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center space-y-4 px-4">
            <div className="text-4xl">📖</div>
            <p className="text-white font-semibold">Ready to Begin?</p>
            <p className="text-sm text-slate-400">Click when you are ready and the timer will start.</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={handleBackToConfig}>Back</Button>
              <Button onClick={handleBegin}>Start Reading</Button>
            </div>
          </div>
        </div>
      )}
      {isReady && isPaused && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={resume}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl">⏸</div>
            <p className="text-white font-semibold">Paused</p>
            <p className="text-sm text-slate-400">Click anywhere to resume</p>
          </div>
        </div>
      )}
    </div>
  );
}
