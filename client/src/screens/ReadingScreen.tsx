/**
 * client/src/screens/ReadingScreen.tsx
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import ReadingEngine from "@/components/session/ReadingEngine";
import ProgressBar from "@/components/session/ProgressBar";
import { motion } from "framer-motion";
import { useUIStore, useUserStore, useSessionStore } from "@/store";
import Button from "@/components/shared/Button";
import { msToTime, readingProgress, calculateActualWpm, getPassageFontSize } from "@/lib/utils";
import { cn } from "@/lib/utils";

const colWidthClass: Record<"narrow" | "medium" | "wide", string> = {
  narrow: "max-w-[38rem]",
  medium: "max-w-[52rem]",
  wide:   "max-w-[65rem]",
};


const sendKeepAliveAbandon = (passageId: string, elapsedMs: number, neverStarted: boolean) => {
  const mockUser = localStorage.getItem("readshift_dev_user");
  const url = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api"}/sessions/abandon`;
  const body = JSON.stringify({
    passage_id: passageId,
    elapsed_ms: elapsedMs,
    never_started: neverStarted,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (mockUser) {
    headers["Authorization"] = `Bearer dev-token`;
    window.fetch(url, { method: "POST", headers, body, keepalive: true }).catch(() => {});
  } else {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      window.fetch(url, { method: "POST", headers, body, keepalive: true }).catch(() => {});
    }).catch(() => {});
  }
};

export default function ReadingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { passage, config, chunks, intervalMs, customChunkIntervalsMs, extraDelayMsByNextChunk, totalChunks, markReadingDone, resetSession, phase, submitSession } = useSession();
  const { setFullscreen } = useUIStore();
  const { user, preferences, fetchProfile } = useUserStore();
  const [isReady, setIsReady] = useState(false);
  const isReadyRef = useRef(false);
  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);
  const [isFinished, setIsFinished] = useState(false);
  const [showFinishedOverlay, setShowFinishedOverlay] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [submittingDirect, setSubmittingDirect] = useState(false);
  const [sessionDurationMs, setSessionDurationMs] = useState(0);
  const [untimedElapsedMs, setUntimedElapsedMs] = useState(0);

  // ── Pure ref-based wall-clock active timer ─────────────────────────────────
  // We deliberately avoid React state so reads are always instantaneous (no
  // render-cycle delay) and we never have a stale-closure problem.
  const activeAccumulatedMsRef = useRef(0);   // ms accumulated before current tracking started
  const activeStartWallRef = useRef<number | null>(null); // performance.now() when tracking started (null = paused)
  const wasPausedRef = useRef(false);                     // tracks if timer was paused before exit dialog

  /** Returns the total active time spent in ms right now. */
  const getActiveTimeSpentMs = useCallback((): number => {
    const accumulated = activeAccumulatedMsRef.current;
    const start = activeStartWallRef.current;
    return start !== null ? accumulated + (performance.now() - start) : accumulated;
  }, []);

  /** Start accumulating active time (idempotent). */
  const startActiveTracking = useCallback(() => {
    if (activeStartWallRef.current === null) {
      activeStartWallRef.current = performance.now();
    }
  }, []);

  /** Pause accumulating active time (idempotent). */
  const pauseActiveTracking = useCallback(() => {
    if (activeStartWallRef.current !== null) {
      activeAccumulatedMsRef.current += performance.now() - activeStartWallRef.current;
      activeStartWallRef.current = null;
    }
  }, []);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const isCatDefault = preferences?.font_size_px === 12;
  const passageFontClass = isCatDefault ? "font-sans" : "font-serif";
  const passageFontSize = getPassageFontSize(preferences?.font_size_px);
  const passageFontFamily = isCatDefault ? "Arial, Calibri, sans-serif" : undefined;

  const handleFinishWithoutMCQs = async () => {
    setSubmittingDirect(true);
    pauseActiveTracking();
    const finalElapsed = (preferences?.timed_passages_enabled ?? true) ? elapsedMs : Math.round(getActiveTimeSpentMs());
    markReadingDone(finalElapsed, Math.round(getActiveTimeSpentMs()));
    try {
      await submitSession();
      navigate("/session/results");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingDirect(false);
    }
  };

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

  useEffect(() => {
    if (!preferences) {
      fetchProfile();
      return;
    }
  }, [preferences, fetchProfile]);

  const handleRestart = () => {
    setIsFinished(false);
    setShowFinishedOverlay(false);
    setSessionDurationMs(0);
    setUntimedElapsedMs(0);
    reset(); // Reset reading timer
    // Reset active clock so a restart begins from 0
    activeAccumulatedMsRef.current = 0;
    activeStartWallRef.current = null;
    handleBegin();
  };

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
    pauseActiveTracking(); // ← freeze wall-clock the instant reading finishes
    const finalElapsed = (preferences?.timed_passages_enabled ?? true) ? elapsed : Math.round(getActiveTimeSpentMs());
    setSessionDurationMs(finalElapsed);
    markReadingDone(finalElapsed, Math.round(getActiveTimeSpentMs()));
    
    const totalParagraphs = passage?.passage?.paragraph_roadmaps?.length ?? 0;
    const finalRoadmap = totalParagraphs > 0 ? passage?.passage?.paragraph_roadmaps?.[totalParagraphs - 1] : null;
    
    if (roadmapsEnabledForPassage && finalRoadmap) {
      isFinalRoadmapRef.current = true;
      setIsRoadmapPaused(true);
      setActiveRoadmap(finalRoadmap);
    } else {
      setIsFinished(true);
      if (!(preferences?.timed_passages_enabled ?? true)) {
        setShowFinishedOverlay(true);
      }
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

  const hasAbandonedRef = useRef(false);
  const elapsedMsRef = useRef(elapsedMs);
  useEffect(() => {
    elapsedMsRef.current = elapsedMs;
  }, [elapsedMs]);

  // Synchronously reset active timer on unmount to prevent background leaks
  useEffect(() => {
    return () => {
      reset();

      const currentPhase = useSessionStore.getState().phase;
      const currentPassage = useSessionStore.getState().passage;
      if (
        currentPassage?.passage?.id &&
        currentPhase !== "results" &&
        currentPhase !== "idle" &&
        currentPhase !== "config" &&
        !hasAbandonedRef.current
      ) {
        hasAbandonedRef.current = true;
        const neverStarted = !isReadyRef.current;
        sendKeepAliveAbandon(
          currentPassage.passage.id,
          Math.round(getActiveTimeSpentMs()),
          neverStarted
        );
      }
    };
  }, [reset]);

  const handleBegin = () => {
    void markPassageSeenInDb();
    startActiveTracking(); // ← start wall-clock when RSVP begins
    const isTimed = preferences?.timed_passages_enabled ?? true;
    if (isTimed && !isRunning && totalChunks > 0) start();
    setIsReady(true);
  };

  const [showExitWarning, setShowExitWarning] = useState(false);

  const [activeRoadmap, setActiveRoadmap] = useState<string | null>(null);
  const [isRoadmapPaused, setIsRoadmapPaused] = useState(false);
  const lastCheckedChunkIndexRef = useRef(-1);
  const isFinalRoadmapRef = useRef(false);
  const hasParagraphRoadmaps = (passage?.passage?.paragraph_roadmaps?.length ?? 0) > 0;
  const isAdmin = user?.is_admin ?? false;
  const roadmapsEnabledForPassage = Boolean(isAdmin && preferences?.roadmaps_enabled && hasParagraphRoadmaps);

  // ── Sync RSVP pause/resume to active clock ──────────────────────────────────
  // The useReadingTimer hook handles its own visibility/blur pausing internally.
  // We mirror those events here so the active clock stays accurate.
  useEffect(() => {
    if (isPaused && isReady && !isFinished) {
      pauseActiveTracking();
    } else if (!isPaused && isRunning) {
      startActiveTracking();
    }
  }, [isPaused, isRunning, isReady, isFinished, pauseActiveTracking, startActiveTracking]);

  // Track elapsed time in untimed mode for the header display
  useEffect(() => {
    const isTimed = preferences?.timed_passages_enabled ?? true;
    if (isTimed || !isReady || isPaused || isFinished) return;

    const interval = setInterval(() => {
      setUntimedElapsedMs(Math.round(getActiveTimeSpentMs()));
    }, 200);

    return () => clearInterval(interval);
  }, [preferences?.timed_passages_enabled, isReady, isPaused, isFinished, getActiveTimeSpentMs]);

  // Handle automatic dismissal of paragraph roadmap after exactly 5 seconds
  useEffect(() => {
    if (!activeRoadmap) return;
    
    const timer = setTimeout(() => {
      setActiveRoadmap(null);
      setIsRoadmapPaused(false);
      
      if (isFinalRoadmapRef.current) {
        isFinalRoadmapRef.current = false;
        setIsFinished(true);
        if (!(preferences?.timed_passages_enabled ?? true)) {
          setShowFinishedOverlay(true);
        }
      } else {
        resume();
        startActiveTracking(); // ← resume clock when roadmap auto-dismisses
      }
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [activeRoadmap, resume, startActiveTracking]);

  // Monitor chunk advances to trigger Paragraph Roadmap pause & overlay
  useEffect(() => {
    if (!roadmapsEnabledForPassage || !isReady || isFinished || isRoadmapPaused) return;
    if (isPaused && !isRoadmapPaused) return;
    
    if (currentChunkIndex === lastCheckedChunkIndexRef.current) return;
    
    const currentChunk = chunks[currentChunkIndex];
    if (currentChunk && currentChunk.isParagraphStart && currentChunk.paragraphIndex > 0) {
      const prevParagraphIdx = currentChunk.paragraphIndex - 1;
      const roadmap = passage?.passage?.paragraph_roadmaps?.[prevParagraphIdx];
      
      if (roadmap) {
        lastCheckedChunkIndexRef.current = currentChunkIndex;
        pause();
        pauseActiveTracking(); // ← pause wall-clock when roadmap pops
        setIsRoadmapPaused(true);
        setActiveRoadmap(roadmap);
      }
    }
  }, [currentChunkIndex, chunks, passage, preferences, roadmapsEnabledForPassage, isReady, isFinished, isPaused, isRoadmapPaused, pause]);

  const handleBackToConfig = () => {
    if (passage?.passage?.id && !hasAbandonedRef.current) {
      hasAbandonedRef.current = true;
      const neverStarted = !isReadyRef.current;
      sendKeepAliveAbandon(
        passage.passage.id,
        Math.round(getActiveTimeSpentMs()),
        neverStarted
      );
    }
    resetSession();
    if (location.state?.fromStartSession) {
      navigate("/dashboard");
    } else {
      navigate("/session/config");
    }
  };

  const triggerExitWarning = () => {
    wasPausedRef.current = isPaused;
    if (isRunning && !isPaused) {
      pause();
    }
    pauseActiveTracking(); // ← freeze clock when exit dialog appears
    setShowExitWarning(true);
  };

  const cancelExitWarning = () => {
    setShowExitWarning(false);
    if (!wasPausedRef.current && isReady && !isFinished) {
      resume();
    }
    if (!wasPausedRef.current) {
      startActiveTracking(); // ← resume clock when user chooses to keep reading (only if it was running before)
    }
  };

  const handleStartSession = () => {
    handleBegin();
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
              className={cn("w-full space-y-6 text-slate-200 leading-relaxed select-text bg-[#0d1527]/50 border border-white/8 p-6 sm:p-10 rounded-2xl shadow-2xl", passageFontClass)}
              style={{ fontSize: `${passageFontSize}px`, fontFamily: passageFontFamily }}
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
          {/* Top bar */}
          <div className="fixed top-0 inset-x-0 z-[60] bg-slate-950/90 backdrop-blur border-b border-white/8">
                {(preferences?.progress_bar_enabled ?? true) && <ProgressBar percent={progress} />}
                <div className="flex items-center justify-between px-3 sm:px-6 h-11 gap-2">
                  <button
                    onClick={triggerExitWarning}
                    className="group flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-md text-xs font-bold nav-action-button"
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
                    <span className="text-xs text-slate-500 tabular-nums">
                      {msToTime((preferences?.timed_passages_enabled ?? true) ? elapsedMs : untimedElapsedMs)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                      {(preferences?.timed_passages_enabled ?? true) ? `${config.target_wpm} WPM` : "N/A WPM"}
                    </span>
                    <button
                      onClick={toggleTheme}
                      className="p-1.5 rounded-full border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 nav-action-button"
                      aria-label="Toggle theme"
                      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                    >
                      {theme === "light" ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                        </svg>
                      )}
                    </button>
                    {(preferences?.timed_passages_enabled ?? true) && (
                      <button
                        onClick={isPaused ? resume : pause}
                        disabled={!isReady}
                        className={cn(
                          "flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-bold transition-all duration-300 shadow-md nav-action-button",
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
                    )}
                  </div>
                </div>
              </div>

              {/* Reading area */}
              <div className="flex-1 flex items-start justify-center pt-20 sm:pt-24 pb-16 px-3 sm:px-6 overflow-y-auto no-scrollbar w-full">
                {(preferences?.timed_passages_enabled ?? true) ? (
                  <ReadingEngine
                    chunks={chunks}
                    currentChunkIndex={currentChunkIndex}
                    fadingEnabled={config.fading_enabled}
                    guideEnabled={config.guide_enabled}
                    colWidth={config.fading_enabled ? "medium" : "medium"}
                    fontSizePx={passageFontSize}
                    highlightIntensity={preferences?.highlight_intensity ?? "moderate"}
                    autoCenterScroll={preferences?.auto_center_scroll ?? true}
                    isPaused={isPaused || !isReady}
                    isCatDefault={isCatDefault}
                  />
                ) : (
                  <div className={cn("w-full mx-auto leading-[1.9] text-slate-300 select-none", colWidthClass[preferences?.col_width ?? "medium"])}>
                    {passage.passage.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((para, idx) => (
                      <p 
                        key={idx} 
                        className={cn("mb-5 font-normal transition-colors duration-300", passageFontClass)}
                        style={{ fontSize: `${passageFontSize}px`, fontFamily: passageFontFamily }}
                      >
                        {para}
                      </p>
                    ))}

                    {/* Done Button — only appears when untimed, not finished, and at the end of the text */}
                    {!isFinished && (
                      <div className="flex justify-end mt-8 pb-10">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <Button 
                            size="md" 
                            className="shadow-2xl shadow-indigo-500/20 font-bold" 
                            onClick={() => handleComplete(elapsedMs)}
                          >
                            I'm Done Reading →
                          </Button>
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Done Button for timed mode — only appears after 50% progress */}
              {(preferences?.timed_passages_enabled ?? true) && progress >= 50 && !isRunning && !isFinished && (
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
                <div className="fixed bottom-10 right-6 sm:right-12 z-40">
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
                  {msToTime(sessionDurationMs)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Achieved Speed</p>
                <p className="text-lg font-mono font-bold text-indigo-400 mt-1">
                  {calculateActualWpm(passage.passage.word_count, sessionDurationMs)} WPM
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {preferences?.mcqs_enabled ?? true ? (
                <Button
                  onClick={() => {
                    markReadingDone(sessionDurationMs, Math.round(getActiveTimeSpentMs()));
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
            className="bg-[#0d1527]/90 border border-indigo-500/25 p-8 rounded-3xl max-w-3xl w-full text-center space-y-6 shadow-2xl relative overflow-hidden paragraph-summary-modal"
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
