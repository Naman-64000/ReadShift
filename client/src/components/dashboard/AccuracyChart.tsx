/**
 * client/src/components/dashboard/AccuracyChart.tsx
 */
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
import type { DomainAccuracy } from "@/types";
import { formatDomain } from "@/lib/utils";
import { WEAK_DOMAIN_ACCURACY_THRESHOLD } from "@/lib/constants";

interface AccuracyChartProps { data: DomainAccuracy[] }

export default function AccuracyChart({ data }: AccuracyChartProps) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-600">
        Complete sessions across domains to see accuracy.
      </div>
    );
  }

  const formatted = data.map((d) => ({ ...d, label: formatDomain(d.domain) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
          formatter={(v: number, _name: string, item) => [
            `${v}% (${(item?.payload as DomainAccuracy | undefined)?.sessions ?? 0} sessions)`, "Accuracy"
          ]}
        />
        <ReferenceLine y={WEAK_DOMAIN_ACCURACY_THRESHOLD} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
          {formatted.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.accuracy < WEAK_DOMAIN_ACCURACY_THRESHOLD ? "#ef4444" : "#6366f1"}
              opacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
