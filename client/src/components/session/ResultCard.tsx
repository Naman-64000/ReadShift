/**
 * client/src/components/session/ResultCard.tsx
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { QUESTION_TYPE_LABELS } from "@/lib/constants";
import type { Question } from "@/types";

interface ResultCardProps {
  question: Question & { correct_index: 0 | 1 | 2 | 3; explanations?: string[] };
  selectedIndex: 0 | 1 | 2 | 3;
  timeTakenMs: number;
  index: number;
}

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function ResultCard({ question, selectedIndex, timeTakenMs, index }: ResultCardProps) {
  const isCorrect = selectedIndex === question.correct_index;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={cn(
        "rounded-2xl border p-5 space-y-4",
        isCorrect ? "border-emerald-500/40 bg-emerald-500/8" : "border-red-500/40 bg-red-500/8"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {QUESTION_TYPE_LABELS[question.type]}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{(timeTakenMs / 1000).toFixed(1)}s</span>
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
          )}>
            {isCorrect ? "Correct" : "Incorrect"}
          </span>
        </div>
      </div>

      {/* Stem */}
      <p className="text-sm font-medium text-slate-200 leading-relaxed">{question.stem}</p>

      {/* Options */}
      <div className="space-y-3.5">
        {question.options.map((opt, idx) => {
          const isSelected = idx === selectedIndex;
          const isCorrectOpt = idx === question.correct_index;
          return (
            <div key={idx} className="space-y-1.5">
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg px-4 py-2.5 text-xs transition-colors duration-150",
                  isCorrectOpt && "bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/20",
                  isSelected && !isCorrect && "bg-red-500/15 text-red-300 font-medium border border-red-500/20",
                  !isSelected && !isCorrectOpt && "text-slate-400 bg-white/2 border border-transparent"
                )}
              >
                <span className="font-bold shrink-0">{OPTIONS[idx]}.</span>
                <span>{opt}</span>
                {isCorrectOpt && <span className="ml-auto shrink-0 text-emerald-400 font-bold">✓</span>}
                {isSelected && !isCorrect && <span className="ml-auto shrink-0 text-red-400 font-bold">✕</span>}
              </div>
              {question.explanations && question.explanations[idx] && (
                <div className="pl-9 pr-4 text-[11px] leading-relaxed text-slate-400 italic font-normal">
                  {question.explanations[idx]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
