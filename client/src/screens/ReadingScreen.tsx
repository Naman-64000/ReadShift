/**
 * client/src/screens/ReadingScreen.tsx
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import ReadingEngine from "@/components/session/ReadingEngine";
import ProgressBar from "@/components/session/ProgressBar";
import { motion } from "framer-motion";
import { useUIStore, useUserStore } from "@/store";
import Button from "@/components/shared/Button";
import { msToTime, readingProgress, calculateActualWpm, parseParagraphsForSkimming } from "@/lib/utils";
import { cn } from "@/lib/utils";

const colWidthClass: Record<"narrow" | "medium" | "wide", string> = {
  narrow: "max-w-[38rem]",
  medium: "max-w-[52rem]",
  wide:   "max-w-[65rem]",
};

export default function ReadingScreen() {
  const navigate = useNavigate();
  const { passage, config, chunks, intervalMs, customChunkIntervalsMs, extraDelayMsByNextChunk, isLaapActive, totalChunks, markReadingDone, resetSession, phase } = useSession();
  const { setFullscreen } = useUIStore();
  const { preferences, fetchProfile } = useUserStore();
  const [isReady, setIsReady] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // 🧠 15-Second Structural Skimming Module States & Lifecycle
  const [isSkimming, setIsSkimming] = useState(false);
  const [skimmingTimeLeft, setSkimmingTimeLeft] = useState(15);
  const skimmingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSkimmingRef = useRef(false);
  const isSkimmingPausedRef = useRef(false);

  const skimmingParagraphs = useMemo(() => {
    if (!passage) return [];
    return parseParagraphsForSkimming(passage.passage.body);
  }, [passage]);

  useEffect(() => {
    isSkimmingRef.current = isSkimming;
  }, [isSkimming]);

  const handleStartSkimming = () => {
    setIsSkimming(true);
    setIsReady(true);
    setSkimmingTimeLeft(15);
    isSkimmingPausedRef.current = false;
    
    if (skimmingTimerRef.current) clearInterval(skimmingTimerRef.current);
    
    skimmingTimerRef.current = setInterval(() => {
      if (isSkimmingPausedRef.current) return;

      setSkimmingTimeLeft((prev) => {
        if (prev <= 1) {
          if (skimmingTimerRef.current) clearInterval(skimmingTimerRef.current);
          setIsSkimming(false);
          if (!isRunning && totalChunks > 0) start();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopSkimmingAndStart = () => {
    if (skimmingTimerRef.current) clearInterval(skimmingTimerRef.current);
    setIsSkimming(false);
    if (!isRunning && totalChunks > 0) start();
  };

  useEffect(() => {
    if (!preferences) fetchProfile();
  }, [preferences, fetchProfile]);

  // Clean up skimming timer on unmount and handle visibility/blur
  useEffect(() => {
    const handlePauseSkimming = () => {
      if (isSkimmingRef.current && !isSkimmingPausedRef.current) {
        isSkimmingPausedRef.current = true;
      }
    };

    const handleResumeSkimming = () => {
      if (isSkimmingRef.current && isSkimmingPausedRef.current) {
        isSkimmingPausedRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePauseSkimming();
      } else {
        handleResumeSkimming();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handlePauseSkimming);
    window.addEventListener("focus", handleResumeSkimming);

    return () => {
      if (skimmingTimerRef.current) {
        clearInterval(skimmingTimerRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handlePauseSkimming);
      window.removeEventListener("focus", handleResumeSkimming);
    };
  }, []);

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
    markReadingDone(elapsed);
    navigate("/session/mcq");
  };

  const { currentChunkIndex, elapsedMs, isPaused, isRunning, start, pause, resume, reset } =
    useReadingTimer({
      totalChunks,
      intervalMs,
      customChunkIntervalsMs,
      extraDelayMsByNextChunk,
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
          
          <div className={cn("flex-1 flex flex-col items-center pt-20 pb-24 px-4 overflow-y-auto mx-auto w-full", colWidthClass[preferences?.col_width ?? "medium"])}>
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-6 text-slate-200 leading-relaxed select-text font-serif bg-[#0d1527]/50 border border-white/8 p-6 sm:p-10 rounded-2xl shadow-2xl"
              style={{ fontSize: `${preferences?.font_size_px ?? 18}px` }}
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
                  markReadingDone(elapsedMs);
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
          {isSkimming ? (
            <>
              {/* Skimming Top Bar */}
              <div className="fixed top-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur border-b border-white/8">
                <div className="w-full h-1 bg-white/5 overflow-hidden">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: `${(skimmingTimeLeft / 15) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                    className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  />
                </div>
                <div className="flex items-center justify-between px-4 sm:px-6 h-11 gap-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    🧠 Structural Skimming (Cognitive Priming)
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300 bg-white/5 border border-white/8 px-2 py-0.5 rounded">
                    {skimmingTimeLeft}s
                  </span>
                </div>
              </div>

              {/* Skimming Reading area */}
              <div className={cn("flex-1 flex flex-col items-start pt-20 pb-28 px-4 overflow-y-auto mx-auto w-full no-scrollbar", colWidthClass[preferences?.col_width ?? "medium"])}>
                <div className="text-center w-full mb-6 space-y-1">
                  <p className="text-xs text-slate-500 font-medium">
                    Focus strictly on the highlighted topic sentences below to prime your mental context schema.
                  </p>
                </div>
                
                <div className="w-full space-y-6">
                  {skimmingParagraphs.map((p, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-indigo-500/20 py-0.5">
                      <span 
                        className="text-white font-medium leading-relaxed font-serif transition-colors duration-300"
                        style={{ fontSize: `${preferences?.font_size_px ?? 18}px` }}
                      >
                        {p.firstSentence}
                      </span>
                      {p.remainingText && (
                        <span 
                          className="text-slate-700 opacity-25 font-normal leading-relaxed font-serif ml-1 select-none"
                          style={{ fontSize: `${preferences?.font_size_px ?? 18}px` }}
                        >
                          {" "}{p.remainingText}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Skimming bottom button */}
              <div className="fixed bottom-8 inset-x-0 flex justify-center z-40">
                <Button 
                  size="lg" 
                  className="shadow-2xl shadow-indigo-500/20 font-bold" 
                  onClick={handleStopSkimmingAndStart}
                >
                  Start Paced Reading Now →
                </Button>
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
                  <div className="flex items-center gap-2">
                    {isLaapActive && (
                      <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                        ⚡ Adaptive
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                      {config.target_wpm} WPM
                    </span>
                  </div>
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
                  fontSizePx={preferences?.font_size_px ?? 18}
                  highlightIntensity={preferences?.highlight_intensity ?? "moderate"}
                  autoCenterScroll={preferences?.auto_center_scroll ?? true}
                  isPaused={isPaused || !isReady}
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
                  <div className="text-center space-y-4 px-4 max-w-md">
                    <div className="text-4xl">📖</div>
                    <p className="text-white font-semibold">Ready to Begin?</p>
                    <p className="text-sm text-slate-400">Click when you are ready and the timer will start.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mt-2">
                      <Button variant="ghost" onClick={handleBackToConfig} className="w-full sm:w-auto">Back</Button>
                      <Button 
                        variant="secondary" 
                        onClick={handleStartSkimming} 
                        className="w-full sm:flex-1 font-bold border border-indigo-500/20 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 whitespace-nowrap"
                      >
                        🧠 Skim First (15s)
                      </Button>
                      <Button onClick={handleBegin} className="w-full sm:flex-1">Start Reading</Button>
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
                  {msToTime(elapsedMs)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Achieved Speed</p>
                <p className="text-lg font-mono font-bold text-indigo-400 mt-1">
                  {calculateActualWpm(passage.passage.word_count, elapsedMs)} WPM
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={() => {
                  markReadingDone(elapsedMs);
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
