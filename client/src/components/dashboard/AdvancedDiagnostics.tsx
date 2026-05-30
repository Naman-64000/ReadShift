/**
 * client/src/components/dashboard/AdvancedDiagnostics.tsx
 * Advanced diagnostics panel including Performance Heatmap matrix,
 * WPM Domain Slowdown analyzer, and optimal Sweet Spot Coach.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DashboardSummary, HeatmapCell } from "@/types";
import { formatDomain } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AdvancedDiagnosticsProps {
  summary: DashboardSummary;
}

export default function AdvancedDiagnostics({ summary }: AdvancedDiagnosticsProps) {
  const navigate = useNavigate();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const { wpm_slowdown = [], heatmap_data = [], sweet_spot } = summary;

  // Standard domains & levels
  const DOMAINS = ["abstract", "science", "business", "history", "social"];
  const LEVELS = [1, 2, 3, 4];

  // Helper: Find cell data
  const getCellData = (domain: string, level: number): HeatmapCell | undefined => {
    return heatmap_data.find((c) => c.domain === domain && c.level === level);
  };

  // Helper: Get HSL grid cell classes based on performance
  const getCellClasses = (cell?: HeatmapCell) => {
    if (!cell || cell.session_count === 0) {
      return "bg-slate-900/40 border border-white/5 border-dashed text-slate-500 hover:bg-slate-800/40 hover:border-white/10";
    }
    if (cell.avg_accuracy >= 80) {
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)] hover:bg-emerald-500/15 hover:border-emerald-500/40";
    }
    if (cell.avg_accuracy >= 70) {
      return "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 shadow-[inset_0_0_12px_rgba(99,102,241,0.05)] hover:bg-indigo-500/15 hover:border-indigo-500/40";
    }
    return "bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-[inset_0_0_12px_rgba(245,158,11,0.05)] hover:bg-amber-500/15 hover:border-amber-500/40";
  };

  // Helper: Handle direct training navigation
  const handleCellClick = (domain: string, level: number) => {
    navigate("/session/config", {
      state: {
        drillDomain: domain,
        drillLevel: level,
      },
    });
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
              {/* Decorative Indigo Gradient Glow */}
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

        {/* 2. 5x4 Heatmap Matrix Column */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/4 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance Matrix</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Accuracy & Speed by Domain × Difficulty. Tap cell to instantly launch drill.</p>
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/30" />
                  <span className="text-slate-400">&ge; 80%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-indigo-500/20 border border-indigo-500/30" />
                  <span className="text-slate-400">70-80%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/30" />
                  <span className="text-slate-400">&lt; 70%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap Grid wrapper */}
          <div className="w-full overflow-x-auto no-scrollbar pt-2">
            <div className="min-w-[480px] grid grid-cols-5 gap-3.5">
              {/* Grid Header column placeholders */}
              <div className="col-span-1" />
              {LEVELS.map((lvl) => (
                <div key={lvl} className="text-center font-bold text-xs text-slate-400 uppercase tracking-widest leading-none pb-1">
                  Level {lvl}
                </div>
              ))}

              {/* Rows */}
              {DOMAINS.map((dom) => (
                <div key={dom} className="contents">
                  {/* Row Label (Domain) */}
                  <div className="col-span-1 flex items-center justify-start text-xs font-bold text-slate-300">
                    {formatDomain(dom)}
                  </div>

                  {/* Level Cells */}
                  {LEVELS.map((lvl) => {
                    const cell = getCellData(dom, lvl);
                    const cellId = `${dom}-${lvl}`;

                    return (
                      <div
                        key={lvl}
                        className={cn(
                          "relative h-[72px] rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer shadow-md select-none",
                          getCellClasses(cell)
                        )}
                        onClick={() => handleCellClick(dom, lvl)}
                        onMouseEnter={() => setHoveredCell(cellId)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {cell && cell.session_count > 0 ? (
                          <>
                            <span className="text-sm font-black tracking-tight leading-none">
                              {cell.avg_accuracy}%
                            </span>
                            <span className="text-[10px] font-bold font-mono opacity-80 mt-1 tabular-nums">
                              {cell.avg_wpm}
                            </span>
                            <span className="text-[8px] opacity-50 font-medium tracking-wide scale-95 mt-0.5 leading-none">
                              WPM
                            </span>
                          </>
                        ) : (
                          <span className="text-lg opacity-40 font-light">+</span>
                        )}

                        {/* Beautiful Floating Tooltip */}
                        {hoveredCell === cellId && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-[#0d1527] border border-white/10 text-slate-200 text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-2xl leading-relaxed pointer-events-none transition-all duration-200">
                            <span className="font-bold text-indigo-400">{formatDomain(dom)} (L{lvl})</span>
                            <br />
                            {cell && cell.session_count > 0 ? (
                              <>
                                Accuracy: <span className="text-white font-bold">{cell.avg_accuracy}%</span> · Speed: <span className="text-white font-bold">{cell.avg_wpm} WPM</span>
                                <br />
                                Sessions completed: <span className="text-white font-bold">{cell.session_count}</span>
                              </>
                            ) : (
                              "No sessions completed yet"
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
