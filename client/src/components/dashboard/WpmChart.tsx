/**
 * client/src/components/dashboard/WpmChart.tsx
 */
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
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

  const avgWpm = Math.round(data.reduce((s, d) => s + d.wpm, 0) / data.length);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
          labelFormatter={formatDate}
          formatter={(v: number) => [`${v} WPM`, "Speed"]}
        />
        <ReferenceLine y={avgWpm} stroke="#6366f1" strokeDasharray="4 4" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="wpm"
          stroke="#818cf8"
          strokeWidth={2.5}
          dot={{ fill: "#818cf8", r: 3 }}
          activeDot={{ r: 5, fill: "#a5b4fc" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
