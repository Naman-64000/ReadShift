import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/store";
import { useDashboardStore } from "@/store";
import ResultCard from "@/components/session/ResultCard";
import Button from "@/components/shared/Button";
import { msToTime, comprehensionLabel, formatDomain } from "@/lib/utils";
import type { Question } from "@/types";
import { apiClient } from "@/lib/apiClient";

export default function ResultsScreen() {
  const navigate = useNavigate();
  const { result, passage, phase, responses, resetSession } = useSessionStore();
  const { invalidate } = useDashboardStore();

  const [ratingSubmitted, setRatingSubmitted] = useState<"up" | "down" | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleRatePassage = async (rating: "up" | "down") => {
    if (ratingSubmitted || isSubmittingRating || !passage) return;
    setIsSubmittingRating(true);
    try {
      await apiClient.post(`/passages/${passage.passage.id}/rate`, { rating });
      setRatingSubmitted(rating);
    } catch (err) {
      // Fail silently
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    if (phase !== "results" || !result) navigate("/session/config", { replace: true });
  }, [phase, result, navigate]);

  // Invalidate dashboard so it refetches fresh data next visit
  useEffect(() => {
    if (result) invalidate();
  }, [result, invalidate]);

  if (!result || !passage) return null;

  const { session, actual_wpm, comprehension } = result;

  const handleNewSession = () => {
    resetSession();
    navigate("/session/config");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Level up celebration */}

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2 sm:gap-4"
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
            const resp = responses.find((r) => r.question_id === q.id);
            if (!resp) return null;
            const dbResp = result.responses.find((r) => r.question_id === q.id);
            const questionWithAnswer = {
              ...q,
              correct_index: dbResp?.correct_index ?? 0,
              explanations: dbResp?.explanations,
            } as Question & { correct_index: 0 | 1 | 2 | 3; explanations?: string[] };
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

        {/* Inline Passage Feedback Loop */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-indigo-950/20 p-6 space-y-4"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">📚 Evaluate Passage Rigour</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Help us maintain absolute reading difficulty and question accuracy standards. How was the linguistic difficulty and comprehension flow of this passage?
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {ratingSubmitted === null ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 justify-center font-bold"
                  onClick={() => handleRatePassage("up")}
                  isLoading={isSubmittingRating}
                >
                  👍 Accurate & Rigorous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 hover:border-rose-500/40 hover:bg-rose-500/5 text-slate-300 hover:text-rose-400 justify-center font-bold"
                  onClick={() => handleRatePassage("down")}
                  isLoading={isSubmittingRating}
                >
                  👎 Low Quality / Flawed
                </Button>
              </>
            ) : ratingSubmitted === "up" ? (
              <div className="w-full text-center py-2.5 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 animate-fadeIn">
                <span>✅ Thank you! We've recorded your positive rating for this passage.</span>
              </div>
            ) : (
              <div className="w-full text-center py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 animate-fadeIn">
                <span>⚠️ Thanks for flagging — we'll review this passage.</span>
              </div>
            )}
          </div>
        </motion.div>

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
