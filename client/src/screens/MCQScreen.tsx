/**
 * client/src/screens/MCQScreen.tsx
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore } from "@/store";
import MCQCard from "@/components/session/MCQCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";

export default function MCQScreen() {
  const navigate = useNavigate();
  const { passage, phase, submitAnswer, submitSession, isSubmitting, error } = useSessionStore();
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const questionStartRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== "mcq" || !passage) navigate("/session/config", { replace: true });
  }, [phase, passage, navigate]);

  useEffect(() => {
    if (phase === "results") navigate("/session/results");
  }, [phase, navigate]);

  // Handle Answer Submission (shared logic)
  const handleAnswer = async (selectedIndex: 0 | 1 | 2 | 3 | null) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTakenMs = Date.now() - questionStartRef.current;
    
    // selectedIndex is null if timer expired
    await submitAnswer({
      question_id: passage!.questions[currentQ].id,
      selected_index: selectedIndex ?? -1 as any, // -1 or special value for missed
      time_taken_ms: Math.min(timeTakenMs, 45000),
    });

    if (currentQ < passage!.questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setTimeLeft(45);
      questionStartRef.current = Date.now();
    } else {
      await submitSession();
    }
  };

  // Timer logic
  useEffect(() => {
    if (isSubmitting || phase !== "mcq") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswer(null); // Auto-submit on expire
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQ, isSubmitting, phase]);

  if (!passage) return null;

  const questions = passage.questions;

  if (isSubmitting) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] pt-14 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Saving your session…" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-14 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-white">Comprehension Check</h1>
          <p className="text-sm text-slate-400">Answer without looking back at the passage.</p>
        </div>

        {/* Timer Progress Bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / 45) * 100}%` }}
            transition={{ duration: 1, ease: "linear" }}
            className={cn(
              "h-full transition-colors duration-300",
              timeLeft > 15 ? "bg-indigo-500" : timeLeft > 5 ? "bg-amber-500" : "bg-red-500"
            )}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 text-center">
            {error} — <button className="underline" onClick={submitSession}>Retry</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <MCQCard
            key={questions[currentQ]?.id}
            question={questions[currentQ]}
            questionNumber={currentQ + 1}
            totalQuestions={questions.length}
            onAnswer={(idx) => handleAnswer(idx as any)}
          />
        </AnimatePresence>

        <div className="text-center">
          <span className={cn(
            "text-xs font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full border",
            timeLeft > 5 ? "text-slate-500 border-white/5" : "text-red-400 border-red-400/20 animate-pulse"
          )}>
            00:{timeLeft.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
