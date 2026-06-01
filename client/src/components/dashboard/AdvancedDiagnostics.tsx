/**
 * client/src/components/dashboard/AdvancedDiagnostics.tsx
 * Advanced diagnostics panel: Domain Performance Matrix, WPM Slowdown analyzer, Sweet Spot Coach.
 * Level dimension removed — domain is the only segregation axis.
 */

import { useNavigate } from "react-router-dom";
import type { DashboardSummary, HeatmapCell } from "@/types";
import { formatDomain } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AdvancedDiagnosticsProps {
  summary: DashboardSummary;
}

const DOMAIN_EMOJIS: Record<string, string> = {
  abstract: "💡",
  science:  "🔬",
  business: "📈",
  history:  "🏛️",
  social:   "🧠",
};

export default function AdvancedDiagnostics({ summary }: AdvancedDiagnosticsProps) {
  const navigate = useNavigate();

  const { wpm_slowdown = [], heatmap_data = [], sweet_spot } = summary;

  const DOMAINS = ["abstract", "science", "business", "history", "social"];

  // Helper: Find cell data for a domain (no level dimension anymore)
  const getCellData = (domain: string): HeatmapCell | undefined =>
    heatmap_data.find((c) => c.domain === domain);

  // Helper: Get classes based on performance
  const getCellClasses = (cell?: HeatmapCell) => {
    if (!cell || cell.session_count === 0) {
      return "bg-slate-900/40 border border-white/5 border-dashed text-slate-500 hover:bg-slate-800/40 hover:border-white/10 hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(255,255,255,0.02)]";
    }
    if (cell.avg_accuracy >= 80) {
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)] hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]";
    }
    if (cell.avg_accuracy >= 70) {
      return "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shadow-[inset_0_0_12px_rgba(99,102,241,0.05)] hover:bg-indigo-500/15 hover:border-indigo-500/40 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]";
    }
    return "bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-[inset_0_0_12px_rgba(245,158,11,0.05)] hover:bg-amber-500/15 hover:border-amber-500/40 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]";
  };

  const handleDomainDrill = (domain: string) => {
    navigate("/session/config", { state: { drillDomain: domain } });
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Diagnostics Title */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide">Advanced Diagnostics</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Granular speed-accuracy breakdowns and optimal training focus points.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Sweet Spot & Slowdowns Column */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
          {/* Sweet Spot Card */}
          {sweet_spot ? (
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 relative overflow-hidden flex-1 flex flex-col justify-center">
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-indigo-500/40 bg-indigo-500/10 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-pulse">
                  <span className="text-[10px] uppercase font-black text-indigo-400 leading-none">Sweet</span>
                  <span className="text-xs font-black text-white leading-none mt-0.5">SPOT</span>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-black">Reading Sweet Spot</p>
                  <p className="text-lg font-mono font-bold text-white mt-0.5">{sweet_spot.wpm_range}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-white/5 pt-4">
                <p className="text-xs leading-relaxed text-slate-300">
                  {sweet_spot.description}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/4 p-6 flex-1 flex flex-col items-center justify-center text-center">
              <span className="text-2xl">🎯</span>
              <p className="text-sm font-semibold text-slate-300 mt-2">Sweet Spot Processing</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                Complete sessions to unlock your reading sweet-spot diagnostic.
              </p>
            </div>
          )}

          {/* Domain WPM Slowdowns */}
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cognitive Slowdowns</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Speed variation across domains relative to overall average.</p>
            </div>

            <div className="space-y-3.5">
              {DOMAINS.map((dom) => {
                const data = wpm_slowdown.find((d) => d.domain === dom);
                const avgWpm = data?.avg_wpm ?? 0;
                const slowdown = data?.slowdown_pct ?? 0;

                return (
                  <div key={dom} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{formatDomain(dom)}</span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {avgWpm > 0 ? (
                          <>
                            <span className="text-white font-bold">{avgWpm}</span>
                            <span className="text-[10px] text-slate-500 ml-0.5">WPM</span>
                          </>
                        ) : (
                          "Untrained"
                        )}
                      </span>
                    </div>

                    {avgWpm > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              slowdown > 0 ? "bg-amber-500/70" : "bg-emerald-500/70"
                            )}
                            style={{ width: `${Math.max(10, Math.min(100, 100 - slowdown))}%` }}
                          />
                        </div>
                        <span 
                          className={cn(
                            "text-[10px] font-bold tracking-wide leading-none select-none min-w-[56px] text-right",
                            slowdown > 0 ? "text-amber-400" : slowdown < 0 ? "text-emerald-400" : "text-slate-400"
                          )}
                        >
                          {slowdown > 0 ? `-${slowdown}%` : slowdown < 0 ? `+${Math.abs(slowdown)}%` : "Baseline"}
                        </span>
                      </div>
                    ) : (
                      <div className="h-1.5 bg-white/5 rounded-full border border-white/5 border-dashed" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Domain Performance Matrix */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/4 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Domain Performance Matrix</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Accuracy & Speed by Domain. Tap a card to drill that domain.</p>
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/30" />
                  <span className="text-slate-400">&ge; 80%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-indigo-500/20 border border-indigo-500/30" />
                  <span className="text-slate-400">70–80%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/30" />
                  <span className="text-slate-400">&lt; 70%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Domain cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {DOMAINS.map((dom) => {
              const cell = getCellData(dom);
              const hasData = cell && cell.session_count > 0;

              return (
                <div
                  key={dom}
                  className={cn(
                    "relative rounded-xl p-4 flex flex-col gap-2 transition-all duration-300 cursor-pointer select-none group",
                    getCellClasses(cell)
                  )}
                  onClick={() => handleDomainDrill(dom)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{DOMAIN_EMOJIS[dom] ?? "📝"}</span>
                    <div className="flex items-center gap-1.5">
                      {hasData && (
                        <span className="text-xs font-bold font-mono tabular-nums opacity-70 group-hover:opacity-40 transition-opacity duration-300">
                          {cell.session_count}×
                        </span>
                      )}
                      <span className="text-[9px] font-black tracking-wider uppercase opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300 bg-white/10 px-2 py-0.5 rounded border border-white/5">
                        Drill →
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                      {formatDomain(dom)}
                    </p>
                    {hasData ? (
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-xl font-black tracking-tight leading-none">
                          {cell.avg_accuracy}%
                        </p>
                        <p className="text-[11px] font-mono font-bold opacity-70">
                          {cell.avg_wpm} WPM
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">No sessions yet — click to drill</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
