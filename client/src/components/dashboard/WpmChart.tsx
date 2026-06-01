/**
 * client/src/components/dashboard/WpmChart.tsx
 * Paced Velocity & Comprehension Evolution dual-axis chart.
 */

import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip
} from "recharts";
import type { WpmDataPoint } from "@/types";
import { formatDate } from "@/lib/utils";

interface WpmChartProps { data: WpmDataPoint[] }

export default function WpmChart({ data }: WpmChartProps) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-600">
        Complete a session to see your trend.
      </div>
    );
  }

  // Pre-calculate averages
  const avgWpm = Math.round(data.reduce((s, d) => s + d.wpm, 0) / data.length);
  const avgAcc = Math.round(data.reduce((s, d) => s + d.accuracy, 0) / data.length);

  return (
    <div className="w-full space-y-4">
      {/* Mini Legend & Stats */}
      <div className="flex items-center justify-between text-xs px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-slate-400 font-medium">Avg Speed: <strong className="text-indigo-300 font-bold">{avgWpm} WPM</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400 font-medium">Avg Accuracy: <strong className="text-emerald-300 font-bold">{avgAcc}%</strong></span>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Last 30 Sessions</span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 12, right: -12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          
          {/* Primary Y Axis - Pacing Speed */}
          <YAxis
            yAxisId="left"
            tick={{ fill: "#818cf8", fontSize: 10, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />

          {/* Secondary Y Axis - Comprehension */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#34d399", fontSize: 10, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />

          <Tooltip
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
            labelFormatter={formatDate}
            formatter={(v: number, name: string) => {
              if (name === "wpm") return [`${v} WPM`, "Pacing Velocity"];
              return [`${v}%`, "Comprehension"];
            }}
          />

          {/* Speed Area Chart */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="wpm"
            stroke="#818cf8"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#wpmGradient)"
          />

          {/* Accuracy Line Chart */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="accuracy"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ fill: "#059669", stroke: "#34d399", strokeWidth: 1.5, r: 3 }}
            activeDot={{ r: 5, fill: "#34d399", stroke: "#059669", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
