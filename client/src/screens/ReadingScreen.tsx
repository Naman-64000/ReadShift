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
import { useUIStore, useUserStore } from "@/store";
import Button from "@/components/shared/Button";
import { msToTime, readingProgress, calculateActualWpm } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function ReadingScreen() {
  const navigate = useNavigate();
  const { passage, config, chunks, paragraphStartChunkIndices, intervalMs, totalChunks, markReadingDone, resetSession, phase } = useSession();
  const { setFullscreen } = useUIStore();
  const { preferences, fetchProfile } = useUserStore();
  const [isReady, setIsReady] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [savedElapsedMs, setSavedElapsedMs] = useState(0);

  useEffect(() => {
    if (!preferences) fetchProfile();
  }, [preferences, fetchProfile]);

  // Redirect if no active session
  useEffect(() => {
    if (phase === "idle" || phase === "config" || !passage) {
      navigate("/session/config", { replace: true });
    }
  }, [phase, passage, navigate]);

  // Enter fullscreen reading mode
  useEffect(() => {
    setFullscreen(true);
    return () => setFullscreen(false);
  }, [setFullscreen]);

  const handleComplete = (elapsed: number) => {
    setSavedElapsedMs(elapsed);
    setIsFinished(true);
  };

  const { currentChunkIndex, elapsedMs, isPaused, isRunning, start, pause, resume, reset } =
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
      {reviewMode ? (
        <>
          {/* Normal Review Mode */}
          <div className="fixed top-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur border-b border-white/8 h-12 flex items-center justify-between px-6">
            <span className="text-xs sm:text-sm font-bold text-indigo-400 uppercase tracking-widest">
              Review Passage (Normal View)
            </span>
            <button
              onClick={() => {
                setReviewMode(false);
                setIsFinished(false);
                setIsReady(false);
                reset(); // Reset reading timer so they can restart paced reading if they want
              }}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-white/8 text-slate-300 hover:text-white transition-colors"
            >
              🔄 Restart Paced
            </button>
          </div>
          
          <div className="flex-1 flex flex-col items-center pt-20 pb-24 px-4 overflow-y-auto max-w-2xl mx-auto w-full">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-6 text-slate-200 text-base sm:text-lg leading-relaxed select-text font-serif bg-[#0d1527]/50 border border-white/8 p-6 sm:p-10 rounded-2xl shadow-2xl"
            >
              {passage.passage.body.split(/\n\s*\n/).map((p, idx) => (
                <p key={idx}>{p.trim()}</p>
              ))}
            </motion.div>
            <div className="mt-8">
              <Button
                size="lg"
                className="shadow-2xl shadow-indigo-500/20 animate-pulse"
                onClick={() => {
                  markReadingDone(savedElapsedMs || elapsedMs);
                  navigate("/session/mcq");
                }}
              >
                Start Comprehension Check →
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
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
          <div className="flex-1 flex items-start justify-center pt-20 sm:pt-24 pb-16 px-3 sm:px-6 overflow-y-auto no-scrollbar">
            <ReadingEngine
              chunks={chunks}
              currentChunkIndex={currentChunkIndex}
              fadingEnabled={config.fading_enabled}
              guideEnabled={config.guide_enabled}
              colWidth={config.fading_enabled ? "medium" : "medium"}
              fontSizePx={18}
              highlightIntensity={preferences?.highlight_intensity ?? "moderate"}
              autoCenterScroll={preferences?.auto_center_scroll ?? true}
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
        </>
      )}

      {/* Finished Overlay / Choice Modal */}
      {isFinished && !reviewMode && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d1527]/90 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl"
          >
            <div className="text-4xl">🎉</div>
            <h2 className="text-2xl font-black text-white">Reading Complete!</h2>
            <p className="text-sm text-slate-400">Excellent job keeping pace with the guide line.</p>
            
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 bg-white/4 border border-white/5 rounded-2xl p-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Elapsed Time</p>
                <p className="text-lg font-mono font-bold text-white mt-1">
                  {msToTime(savedElapsedMs || elapsedMs)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Achieved Speed</p>
                <p className="text-lg font-mono font-bold text-indigo-400 mt-1">
                  {calculateActualWpm(passage.passage.word_count, savedElapsedMs || elapsedMs)} WPM
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={() => {
                  markReadingDone(savedElapsedMs || elapsedMs);
                  navigate("/session/mcq");
                }}
                className="w-full justify-center shadow-lg shadow-indigo-500/20 font-bold"
              >
                Start Comprehension Check →
              </Button>
              <Button
                variant="secondary"
                onClick={() => setReviewMode(true)}
                className="w-full justify-center text-slate-200"
              >
                👁 Review Passage (Normal View)
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsFinished(false);
                  setIsReady(false);
                  reset(); // Restart paced reading
                }}
                className="w-full justify-center text-slate-400 hover:text-white"
              >
                🔄 Restart Paced Reading
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
