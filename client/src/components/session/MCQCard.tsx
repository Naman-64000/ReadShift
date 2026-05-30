/**
 * client/src/components/session/MCQCard.tsx
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { QUESTION_TYPE_LABELS } from "@/lib/constants";
import type { Question } from "@/types";

interface MCQCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: 0 | 1 | 2 | 3) => void;
}

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function MCQCard({ question, questionNumber, totalQuestions, onAnswer }: MCQCardProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    if (selected !== null) return; // prevent double-tap
    setSelected(idx);
    // Brief delay to show selection state before advancing
    setTimeout(() => onAnswer(idx as 0 | 1 | 2 | 3), 350);
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
          {QUESTION_TYPE_LABELS[question.type] ?? question.type}
        </span>
        <span className="text-xs text-slate-500">
          {questionNumber} / {totalQuestions}
        </span>
      </div>

      {/* Question stem */}
      <p className="text-lg font-medium text-white leading-relaxed">{question.stem}</p>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={selected !== null}
            className={cn(
              "w-full text-left flex items-start gap-4 rounded-xl border px-5 py-4",
              "transition-all duration-150 text-sm font-medium",
              selected === idx
                ? "border-indigo-500 bg-indigo-500/15 text-white"
                : selected !== null
                ? "border-white/8 text-slate-500 cursor-default"
                : "border-white/12 bg-white/4 text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-500/8 hover:text-white cursor-pointer"
            )}
          >
            <span className={cn(
              "shrink-0 flex items-center justify-center h-6 w-6 rounded-md text-xs font-bold",
              selected === idx ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400"
            )}>
              {OPTIONS[idx]}
            </span>
            <span className="pt-0.5">{opt}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
