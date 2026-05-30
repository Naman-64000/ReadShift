/**
 * client/src/screens/MCQScreen.tsx
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore, useUserStore } from "@/store";
import MCQCard from "@/components/session/MCQCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";

export default function MCQScreen() {
  const navigate = useNavigate();
  const { preferences, fetchProfile } = useUserStore();
  const { passage, phase, submitAnswer, submitSession, isSubmitting, error, responses } = useSessionStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [showPassage, setShowPassage] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!preferences) fetchProfile();
  }, [preferences, fetchProfile]);

  useEffect(() => {
    if (phase !== "mcq" || !passage) navigate("/session/config", { replace: true });
  }, [phase, passage, navigate]);

  useEffect(() => {
    if (phase === "results") navigate("/session/results");
  }, [phase, navigate]);

  const mcqTimerSeconds = preferences?.mcq_timer ?? 0;

  useEffect(() => {
    if (mcqTimerSeconds > 0) {
      setTimeLeft(mcqTimerSeconds);
    }
  }, [mcqTimerSeconds, currentQ]);

  // Handle Answer Submission (shared logic)
  const handleAnswer = async (selectedIndex: 0 | 1 | 2 | 3 | null) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTakenMs = Date.now() - questionStartRef.current;
    
    // selectedIndex is null if timer expired
    await submitAnswer({
      question_id: passage!.questions[currentQ].id,
      selected_index: selectedIndex ?? -1 as any, // -1 or special value for missed
      time_taken_ms: Math.min(timeTakenMs, mcqTimerSeconds > 0 ? mcqTimerSeconds * 1000 : 999999),
    });

    if (mcqTimerSeconds > 0) {
      if (currentQ < passage!.questions.length - 1) {
        setCurrentQ((q) => q + 1);
        setTimeLeft(mcqTimerSeconds);
        questionStartRef.current = Date.now();
      } else {
        await submitSession();
      }
    }
  };

  // Timer logic
  useEffect(() => {
    if (isSubmitting || phase !== "mcq" || mcqTimerSeconds === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(null); // Auto-submit on expire
          return mcqTimerSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQ, isSubmitting, phase, mcqTimerSeconds]);

  if (!passage) return null;

  const questions = passage.questions;

  const activeResponse = responses.find((r) => r.question_id === questions[currentQ]?.id);
  const selectedOption = activeResponse ? activeResponse.selected_index : null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isSubmitting) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] pt-14 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Saving your session…" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-14 flex items-center justify-center px-4 py-8">
      <div className={cn("w-full transition-all duration-500", showPassage ? "max-w-6xl" : "max-w-2xl")}>
        
        {/* Header split or centered */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-2xl font-black text-white">Comprehension Check</h1>
            <p className="text-sm text-slate-400">
              {mcqTimerSeconds > 0 
                ? "Answer before the timer expires. You cannot view the passage or change answers once submitted."
                : "Read the passage carefully and select your answers."}
            </p>
          </div>
          <button
            onClick={() => setShowPassage(!showPassage)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 shadow-sm shrink-0",
              showPassage
                ? "bg-indigo-500/20 border-indigo-500 text-white shadow-indigo-500/10"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/8 hover:text-white"
            )}
          >
            {showPassage ? "👁 Hide Passage" : "👁 View Passage"}
          </button>
        </div>

        {/* Outer container grid */}
        <div className={cn("grid gap-8 items-start", showPassage ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
          
          {/* Left Column: Passage (Normal View) */}
          {showPassage && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full bg-[#0d1527]/50 border border-white/8 rounded-2xl p-6 sm:p-8 space-y-4 max-h-[60vh] overflow-y-auto shadow-2xl custom-scrollbar"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-indigo-500/10 pb-2">
                Passage Content
              </h3>
              <div className="space-y-4 text-slate-200 text-sm sm:text-[15px] leading-relaxed select-text font-serif">
                {passage.passage.body.split(/\n\s*\n/).map((p, i) => (
                  <p key={i} className="indent-4 sm:indent-8">{p.trim()}</p>
                ))}
              </div>
            </motion.div>
          )}

          {/* Right Column: MCQ Card & navigation */}
          <div className="space-y-6">
            
            {/* Timer Progress Bar */}
            {mcqTimerSeconds > 0 && (
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / mcqTimerSeconds) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                  className={cn(
                    "h-full transition-colors duration-300",
                    timeLeft > (mcqTimerSeconds * 0.3) ? "bg-indigo-500" : timeLeft > (mcqTimerSeconds * 0.1) ? "bg-amber-500" : "bg-red-500"
                  )}
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 text-center">
                {error} — <button className="underline font-semibold" onClick={submitSession}>Retry</button>
              </div>
            )}

            <AnimatePresence mode="wait">
              <MCQCard
                key={questions[currentQ]?.id}
                question={questions[currentQ]}
                questionNumber={currentQ + 1}
                totalQuestions={questions.length}
                selectedOption={selectedOption}
                onAnswer={(idx) => handleAnswer(idx as any)}
                isTimed={mcqTimerSeconds > 0}
              />
            </AnimatePresence>

            {/* Back / Next navigation for Untimed Mode */}
            {mcqTimerSeconds === 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <button
                  disabled={currentQ === 0}
                  onClick={() => {
                    setCurrentQ((q) => q - 1);
                    questionStartRef.current = Date.now();
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-xs font-semibold transition-all",
                    currentQ === 0
                      ? "border-white/5 text-slate-600 bg-transparent cursor-not-allowed"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8 hover:text-white"
                  )}
                >
                  ← Previous
                </button>
                
                {currentQ < questions.length - 1 ? (
                  <button
                    onClick={() => {
                      setCurrentQ((q) => q + 1);
                      questionStartRef.current = Date.now();
                    }}
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/8 hover:text-white text-xs font-semibold transition-all"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={submitSession}
                    className="px-5 py-2 rounded-xl bg-indigo-500 border border-indigo-400 text-xs font-bold text-white shadow-lg hover:bg-indigo-600 transition-all shadow-indigo-500/20"
                  >
                    Finish Assessment ✓
                  </button>
                )}
              </div>
            )}

            {/* Timer Footer */}
            {mcqTimerSeconds > 0 && (
              <div className="text-center pt-2">
                <span className={cn(
                  "text-xs font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full border",
                  timeLeft > 5 ? "text-slate-500 border-white/5" : "text-red-400 border-red-400/20 animate-pulse"
                )}>
                  {formatSeconds(timeLeft)}
                </span>
              </div>
            )}
            
          </div>
        </div>
        
      </div>
    </div>
  );
}
