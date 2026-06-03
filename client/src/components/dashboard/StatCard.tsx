/**
 * client/src/components/dashboard/StatCard.tsx
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  accent?: string;
}

const trendIcons = { up: "↑", down: "↓", neutral: "→" };
const trendColours = { up: "text-emerald-400", down: "text-red-400", neutral: "text-slate-500" };

export default function StatCard({ label, value, subtitle, trend, accent = "text-[rgb(var(--text))]" }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-1.5"
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={cn("text-3xl font-black tabular-nums", accent)}>{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          {trend && (
            <span className={trendColours[trend]}>{trendIcons[trend]}</span>
          )}
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
