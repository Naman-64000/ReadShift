/**
 * client/src/components/dashboard/AccuracyChart.tsx
 * Cognitive Sweet Spot Analyzer: plots speed ranges vs comprehension accuracy.
 */

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ReferenceLine
} from "recharts";
import type { WpmComprehensionCorrelation } from "@/types";

interface AccuracyChartProps { data: WpmComprehensionCorrelation[] }

export default function AccuracyChart({ data }: AccuracyChartProps) {
  const hasData = data && data.some((d) => d.session_count > 0);

  if (!hasData) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-600">
        Complete sessions at different speeds to unlock Sweet Spot analysis.
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Mini Legend & Stats */}
      <div className="flex items-center justify-between text-xs px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-indigo-500 rounded" />
          <span className="text-slate-400 font-medium">Target Floor: <strong className="text-slate-200">70% Comprehension</strong></span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Cognitive Thresholds</span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          
          <XAxis 
            dataKey="wpm_range" 
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} 
            axisLine={false} 
            tickLine={false} 
          />
          
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} 
            axisLine={false} 
            tickLine={false} 
          />
          
          <Tooltip
            cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
            contentStyle={{ 
              background: "rgba(15, 23, 42, 0.95)", 
              border: "1px solid rgba(255, 255, 255, 0.08)", 
              borderRadius: "16px", 
              fontSize: "11px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(8px)"
            }}
            itemStyle={{ color: "#e2e8f0" }}
            labelStyle={{ color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}
            formatter={(v: any, _name: any, item: any) => {
              const payload = item?.payload as WpmComprehensionCorrelation | undefined;
              const count = payload?.session_count ?? 0;
              return [
                `${v}% accuracy (${count} session${count === 1 ? "" : "s"})`,
                "Comprehension"
              ];
            }}
          />
          
          <ReferenceLine 
            y={70} 
            stroke="#6366f1" 
            strokeDasharray="4 4" 
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />
          
          <Bar dataKey="avg_accuracy" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => {
              let color = "#ef4444"; // red
              if (entry.session_count === 0) {
                color = "rgba(255, 255, 255, 0.05)";
              } else if (entry.avg_accuracy >= 70) {
                color = "#10b981"; // emerald
              } else if (entry.avg_accuracy >= 50) {
                color = "#f59e0b"; // amber
              }
              
              return (
                <Cell
                  key={i}
                  fill={color}
                  opacity={entry.session_count === 0 ? 0.3 : 0.85}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
