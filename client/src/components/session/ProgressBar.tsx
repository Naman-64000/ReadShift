/**
 * client/src/components/session/ProgressBar.tsx
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percent: number;
  className?: string;
}

export default function ProgressBar({ percent, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("h-1 w-full bg-white/10 rounded-full overflow-hidden", className)}>
      <motion.div
        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
        animate={{ width: `${clamped}%` }}
        transition={{ ease: "linear", duration: 0.3 }}
      />
    </div>
  );
}
