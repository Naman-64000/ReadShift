/**
 * client/src/screens/ReadingScreen.tsx
 */

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
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
  const { passage, config, chunks, intervalMs, customChunkIntervalsMs, extraDelayMsByNextChunk, isLaapActive, totalChunks, markReadingDone, resetSession, phase, submitSession } = useSession();
  const { setFullscreen } = useUIStore();
  const { preferences, fetchProfile } = useUserStore();
  const [isReady, setIsReady] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showFinishedOverlay, setShowFinishedOverlay] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [submittingDirect, setSubmittingDirect] = useState(false);

  const handleFinishWithoutMCQs = async () => {
    setSubmittingDirect(true);
    markReadingDone(elapsedMs);
    try {
      await submitSession();
      navigate("/session/results");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingDirect(false);
    }
  };

  // 🧠 15-Second Structural Skimming Module States & Lifecycle
  const [isSkimming, setIsSkimming] = useState(false);
  const [skimmingTimeLeft, setSkimmingTimeLeft] = useState(15);
  const skimmingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSkimmingRef = useRef(false);
  const isSkimmingPausedRef = useRef(false);

  const hasMarkedSeenRef = useRef(false);
  const markPassageSeenInDb = useCallback(async () => {
    if (hasMarkedSeenRef.current || !passage?.passage?.id) return;
    hasMarkedSeenRef.current = true;
    try {
      await apiClient.post("/sessions/mark-seen", { passage_id: passage.passage.id });
    } catch (err) {
      console.error("Failed to mark passage as seen:", err);
    }
  }, [passage]);

  const skimmingParagraphs = useMemo(() => {
    if (!passage) return [];
    return parseParagraphsForSkimming(passage.passage.body);
  }, [passage]);

  useEffect(() => {
    isSkimmingRef.current = isSkimming;
  }, [isSkimming]);

  const handleStartSkimming = () => {
    void markPassageSeenInDb();
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
    if (!preferences) {
      fetchProfile();
      return;
    }
  }, [preferences, fetchProfile]);

  const handleRestart = () => {
    setIsFinished(false);
    setShowFinishedOverlay(false);
    reset(); // Reset reading timer
    const isSkimOn = preferences?.skim_enabled ?? true;
    if (isSkimOn) {
      handleStartSkimming();
    } else {
      handleBegin();
    }
  };

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
    
    const totalParagraphs = passage?.passage?.paragraph_roadmaps?.length ?? 0;
    const finalRoadmap = totalParagraphs > 0 ? passage?.passage?.paragraph_roadmaps?.[totalParagraphs - 1] : null;
    
    if (roadmapsEnabledForPassage && finalRoadmap) {
      isFinalRoadmapRef.current = true;
      setIsRoadmapPaused(true);
      setActiveRoadmap(finalRoadmap);
    } else {
      setIsFinished(true);
    }
  };

  const { currentChunkIndex, elapsedMs, isPaused, isRunning, start, pause, resume, reset } =
    useReadingTimer({
      totalChunks,
      intervalMs,
      customChunkIntervalsMs,
      extraDelayMsByNextChunk,
      onComplete: handleComplete,
    });

  // Synchronously reset all active timers (paced and skimming) on unmount to prevent background leaks
  useEffect(() => {
    return () => {
      reset();
      if (skimmingTimerRef.current) {
        clearInterval(skimmingTimerRef.current);
      }
    };
  }, [reset]);

  const handleBegin = () => {
    void markPassageSeenInDb();
    if (!isRunning && totalChunks > 0) start();
    setIsReady(true);
  };

  const [showExitWarning, setShowExitWarning] = useState(false);

  const [activeRoadmap, setActiveRoadmap] = useState<string | null>(null);
  const [isRoadmapPaused, setIsRoadmapPaused] = useState(false);
  const lastCheckedChunkIndexRef = useRef(-1);
  const isFinalRoadmapRef = useRef(false);
  const hasParagraphRoadmaps = (passage?.passage?.paragraph_roadmaps?.length ?? 0) > 0;
  const roadmapsEnabledForPassage = Boolean(preferences?.roadmaps_enabled && hasParagraphRoadmaps);

  // Handle automatic dismissal of paragraph roadmap after exactly 5 seconds
  useEffect(() => {
    if (!activeRoadmap) return;
    
    const timer = setTimeout(() => {
      setActiveRoadmap(null);
      setIsRoadmapPaused(false);
      
      if (isFinalRoadmapRef.current) {
        isFinalRoadmapRef.current = false;
        setIsFinished(true);
      } else {
        resume();
      }
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [activeRoadmap, resume]);

  // Monitor chunk advances to trigger Paragraph Roadmap pause & overlay
  useEffect(() => {
    if (!roadmapsEnabledForPassage || !isReady || isFinished || isSkimming || isRoadmapPaused) return;
    if (isPaused && !isRoadmapPaused) return;
    
    if (currentChunkIndex === lastCheckedChunkIndexRef.current) return;
    
    const currentChunk = chunks[currentChunkIndex];
    if (currentChunk && currentChunk.isParagraphStart && currentChunk.paragraphIndex > 0) {
      const prevParagraphIdx = currentChunk.paragraphIndex - 1;
      const roadmap = passage?.passage?.paragraph_roadmaps?.[prevParagraphIdx];
      
      if (roadmap) {
        lastCheckedChunkIndexRef.current = currentChunkIndex;
        pause();
        setIsRoadmapPaused(true);
        setActiveRoadmap(roadmap);
      }
    }
  }, [currentChunkIndex, chunks, passage, preferences, roadmapsEnabledForPassage, isReady, isFinished, isPaused, isRoadmapPaused, isSkimming, pause]);

  const handleBackToConfig = () => {
    resetSession();
    navigate("/session/config");
  };

  const triggerExitWarning = () => {
    if (isRunning && !isPaused) {
      pause();
    }
    if (isSkimmingRef.current) {
      isSkimmingPausedRef.current = true;
    }
    setShowExitWarning(true);
  };

  const cancelExitWarning = () => {
    setShowExitWarning(false);
    if (!isPaused && isReady && !isFinished) {
      resume();
    }
    if (isSkimmingRef.current) {
      isSkimmingPausedRef.current = false;
    }
  };

  const handleStartSession = () => {
    const isSkimOn = preferences?.skim_enabled ?? true;
    if (isSkimOn) {
      handleStartSkimming();
    } else {
      handleBegin();
    }
  };

  if (!passage || !config || !preferences) return null;

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
                handleRestart();
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
              {preferences?.mcqs_enabled ?? true ? (
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
              ) : (
                <Button
                  size="lg"
                  className="shadow-2xl shadow-indigo-500/20 animate-pulse bg-indigo-600 hover:bg-indigo-500"
                  isLoading={submittingDirect}
                  onClick={handleFinishWithoutMCQs}
                >
                  View Results & Finish →
                </Button>
              )}
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
                {(preferences?.progress_bar_enabled ?? true) && <ProgressBar percent={progress} />}
                <div className="flex items-center justify-between px-3 sm:px-6 h-11 gap-2">
                  <button
                    onClick={triggerExitWarning}
                    className="group flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-md text-xs font-bold"
                  >
                    <svg
                      className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </button>
                  {(preferences?.timer_enabled ?? true) ? (
                    <span className="text-xs text-slate-500 tabular-nums">{msToTime(elapsedMs)}</span>
                  ) : (
                    <span />
                  )}
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
                      "flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-bold transition-all duration-300 shadow-md",
                      isPaused
                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/35 hover:border-indigo-500/50 shadow-indigo-500/10 animate-pulse scale-[1.03]"
                        : "bg-slate-900/60 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20",
                      !isReady && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isPaused ? (
                      <>
                        <svg className="w-3.5 h-3.5 fill-current text-indigo-400" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 fill-current text-slate-400" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                        <span>Pause</span>
                      </>
                    )}
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
              {progress >= 50 && !isRunning && !isFinished && (
                <div className="fixed bottom-10 inset-x-0 flex justify-center z-40">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Button size="lg" className="shadow-2xl shadow-indigo-500/20" onClick={() => handleComplete(elapsedMs)}>
                      I'm Done Reading →
                    </Button>
                  </motion.div>
                </div>
              )}

              {/* Next Button — appears when paced reading ends but Finished Overlay is not yet triggered */}
              {isFinished && !showFinishedOverlay && (
                <div className="fixed bottom-10 inset-x-0 flex justify-center z-40">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Button size="lg" className="shadow-2xl shadow-indigo-500/20 px-8 font-bold flex items-center gap-2" onClick={() => setShowFinishedOverlay(true)}>
                      Next
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Button>
                  </motion.div>
                </div>
              )}

              {/* Paused overlay */}
              {!isReady && (
                <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 ready-to-begin-overlay">
                  <div className="text-center space-y-4 px-4 max-w-md">
                    <div className="text-4xl">📖</div>
                    <p className="text-white font-semibold">Ready to Begin?</p>
                    <p className="text-sm text-slate-400">Click start when you are ready to begin the session.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mt-2">
                      <Button variant="ghost" onClick={handleBackToConfig} className="w-full sm:w-auto">Back</Button>
                      <Button onClick={handleStartSession} className="w-full sm:flex-1">Start Reading</Button>
                    </div>
                  </div>
                </div>
              )}
              {isReady && isPaused && (
                <div
                  className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 paused-overlay"
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
      {isFinished && showFinishedOverlay && !reviewMode && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 px-4 finished-overlay">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d1527]/90 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl finished-modal"
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
              {preferences?.mcqs_enabled ?? true ? (
                <Button
                  onClick={() => {
                    markReadingDone(elapsedMs);
                    navigate("/session/mcq");
                  }}
                  className="w-full justify-center shadow-lg shadow-indigo-500/20 font-bold"
                >
                  Start Comprehension Check →
                </Button>
              ) : (
                <Button
                  onClick={handleFinishWithoutMCQs}
                  isLoading={submittingDirect}
                  className="w-full justify-center shadow-lg shadow-indigo-500/20 font-bold bg-indigo-600 hover:bg-indigo-500"
                >
                  View Results & Finish →
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setReviewMode(true)}
                className="w-full justify-center text-slate-200"
              >
                👁 Review Passage (Normal View)
              </Button>
              <Button
                variant="ghost"
                onClick={handleRestart}
                className="w-full justify-center text-slate-400 hover:text-white"
              >
                🔄 Restart Paced Reading
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Exit warning modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d1527] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl"
          >
            <div className="text-3xl">⚠️</div>
            <h2 className="text-xl font-black text-white">Abort Reading Session?</h2>
            <p className="text-xs text-slate-400 leading-relaxed text-left sm:text-center">
              Are you sure you want to exit early? This will end your active practice and count as an incomplete session in your progress history.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1 text-slate-300 hover:text-white"
                onClick={cancelExitWarning}
              >
                Keep Reading
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-500 hover:shadow-red-500/10 text-white"
                onClick={handleBackToConfig}
              >
                Yes, Exit
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Paragraph Summary Flow (Paragraph Roadmaps) Modal Overlay */}
      {activeRoadmap && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 px-4 paragraph-summary-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0d1527]/90 border border-indigo-500/25 p-8 rounded-3xl max-w-xl w-full text-center space-y-6 shadow-2xl relative overflow-hidden paragraph-summary-modal"
          >
            {/* Background accent glow */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🗺️</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Paragraph Summary Flow</h3>
              </div>
              <h2 className="text-lg font-black text-white pt-2 px-2">Keep building your mental map</h2>
              <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
                Reflect briefly on this paragraph's core cognitive transition before pacing resumes:
              </p>
            </div>

            {/* Roadmap flow layout */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 space-y-3 overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-500/25 paragraph-summary-flow-card">
              <div className="flex flex-row flex-nowrap items-center justify-center gap-2 text-sm font-semibold leading-relaxed whitespace-nowrap min-w-max mx-auto">
                {activeRoadmap.split(" → ").map((kw, i, arr) => (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-100 bg-white/4 px-3 py-1.5 rounded-xl border border-white/5 shadow-sm shrink-0 paragraph-summary-chip">{kw}</span>
                    {i < arr.length - 1 && (
                      <span className="text-indigo-400 text-lg font-bold animate-pulse shrink-0">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic leading-relaxed">
              Pacing is currently paused. Guide line will automatically resume in a few seconds...
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
