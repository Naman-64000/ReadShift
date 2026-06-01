/**
 * client/src/components/session/MCQCard.tsx
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { QUESTION_TYPE_LABELS } from "@/lib/constants";
import type { Question } from "@/types";

interface MCQCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedOption: number | null;
  onAnswer: (selectedIndex: 0 | 1 | 2 | 3) => void;
  isTimed: boolean;
}

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function MCQCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  onAnswer,
  isTimed,
}: MCQCardProps) {
  const [selected, setSelected] = useState<number | null>(selectedOption);
  const [shuffledOptions, setShuffledOptions] = useState<Array<{ text: string; originalIndex: number }>>([]);

  useEffect(() => {
    setSelected(selectedOption);
  }, [selectedOption, question.id]);

  useEffect(() => {
    const mapped = question.options.map((text, index) => ({ text, originalIndex: index }));
    
    // Mathematically robust, completely random Fisher-Yates shuffle
    const shuffled = [...mapped];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    setShuffledOptions(shuffled);
  }, [question.id, question.options]);

  const handleSelect = (originalIdx: number) => {
    if (isTimed && selected !== null) return;
    setSelected(originalIdx);
    
    if (isTimed) {
      setTimeout(() => onAnswer(originalIdx as 0 | 1 | 2 | 3), 350);
    } else {
      onAnswer(originalIdx as 0 | 1 | 2 | 3);
    }
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
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
        {shuffledOptions.map((optObj, idx) => {
          const isSelected = selected === optObj.originalIndex;

          return (
            <button
              key={idx}
              onClick={() => handleSelect(optObj.originalIndex)}
              disabled={isTimed && selected !== null}
              className={cn(
                "w-full text-left flex items-start gap-4 rounded-xl border px-5 py-4",
                "transition-all duration-150 text-sm font-medium",
                isSelected
                  ? "border-indigo-500 bg-indigo-500/15 text-white"
                  : (isTimed && selected !== null)
                  ? "border-white/8 text-slate-500 cursor-default"
                  : "border-white/12 bg-white/4 text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-500/8 hover:text-white cursor-pointer"
              )}
            >
              <span className={cn(
                "shrink-0 flex items-center justify-center h-6 w-6 rounded-md text-xs font-bold",
                isSelected ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400"
              )}>
                {OPTIONS[idx]}
              </span>
              <span className="pt-0.5">{optObj.text}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
