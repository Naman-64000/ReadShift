/**
 * client/src/screens/ResultsScreen.tsx
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/store";
import { useDashboardStore } from "@/store";
import ResultCard from "@/components/session/ResultCard";
import Button from "@/components/shared/Button";
import { msToTime, comprehensionLabel, formatDomain } from "@/lib/utils";
import type { Question } from "@/types";

export default function ResultsScreen() {
  const navigate = useNavigate();
  const { result, passage, phase, responses, resetSession } = useSessionStore();
  const { invalidate } = useDashboardStore();

  useEffect(() => {
    if (phase !== "results" || !result) navigate("/session/config", { replace: true });
  }, [phase, result, navigate]);

  // Invalidate dashboard so it refetches fresh data next visit
  useEffect(() => {
    if (result) invalidate();
  }, [result, invalidate]);

  if (!result || !passage) return null;

  const { session, actual_wpm, comprehension, level_up } = result;

  const handleNewSession = () => {
    resetSession();
    navigate("/session/config");
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-14 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Level up celebration */}
        {level_up && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-4 rounded-2xl border border-amber-500/40 bg-amber-500/10"
          >
            <div className="text-4xl">🎉</div>
            <p className="text-amber-300 font-bold text-lg mt-2">Level Up!</p>
            <p className="text-amber-200/60 text-sm">You've advanced to the next difficulty level.</p>
          </motion.div>
        )}

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { label: "Speed",        value: `${actual_wpm}`, unit: "WPM" },
            { label: "Comprehension",value: `${comprehension}/3`,  unit: comprehensionLabel(comprehension) },
            { label: "Time",         value: msToTime(session.elapsed_ms), unit: formatDomain(session.domain) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/4 p-5 text-center space-y-1"
            >
              <div className="text-2xl font-black text-white tabular-nums">{stat.value}</div>
              <div className="text-xs text-indigo-400 font-semibold">{stat.unit}</div>
              <div className="text-[11px] text-slate-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* MCQ breakdown */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Question Review
          </h2>
          {passage.questions.map((q, i) => {
            const resp = responses[i];
            if (!resp) return null;
            const questionWithAnswer = {
              ...q,
              // correct_index is returned in the session result responses
              correct_index: result.responses[i]?.is_correct
                ? resp.selected_index
                : ([0, 1, 2, 3].find(
                    (n) => n !== resp.selected_index
                  ) as 0 | 1 | 2 | 3) ?? 0,
            } as Question & { correct_index: 0 | 1 | 2 | 3 };
            return (
              <ResultCard
                key={q.id}
                question={questionWithAnswer}
                selectedIndex={resp.selected_index}
                timeTakenMs={resp.time_taken_ms}
                index={i}
              />
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button size="lg" className="flex-1" onClick={handleNewSession}>
            Start Another Session
          </Button>
          <Button size="lg" variant="secondary" className="flex-1" onClick={() => navigate("/dashboard")}>
            View Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
