/**
 * client/src/components/dashboard/StreakBadge.tsx
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STREAK_MILESTONE } from "@/lib/constants";

interface StreakBadgeProps { streakDays: number }

export default function StreakBadge({ streakDays }: StreakBadgeProps) {
  const isMilestone = streakDays >= STREAK_MILESTONE;
  const isActive = streakDays > 0;

  return (
    <motion.div
      animate={isMilestone ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold",
        isMilestone ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
          : isActive ? "bg-white/8 text-slate-300"
          : "bg-white/4 text-slate-600"
      )}
    >
      <span className={isMilestone ? "animate-bounce" : ""}>{isActive ? "🔥" : "💤"}</span>
      {streakDays} day{streakDays !== 1 ? "s" : ""} streak
    </motion.div>
  );
}
