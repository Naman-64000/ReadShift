/**
 * client/src/screens/DashboardScreen.tsx
 */

import { useNavigate } from "react-router-dom";

import { useDashboard } from "@/hooks/useDashboard";
import StatCard from "@/components/dashboard/StatCard";
import WpmChart from "@/components/dashboard/WpmChart";
import AccuracyChart from "@/components/dashboard/AccuracyChart";
import StreakBadge from "@/components/dashboard/StreakBadge";
import RecommendationCard from "@/components/dashboard/RecommendationCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Button from "@/components/shared/Button";
import AdvancedDiagnostics from "@/components/dashboard/AdvancedDiagnostics";
import { comprehensionToPercent, formatDomain } from "@/lib/utils";

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { summary, error, refresh } = useDashboard();

  if (!summary) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] pt-20 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading your progress…" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] pt-20 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Button variant="secondary" onClick={refresh}>Retry</Button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-20 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Your Progress</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Level {summary.current_level} · {summary.sessions_completed} sessions completed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StreakBadge streakDays={summary.streak_days} />
            <Button size="sm" onClick={() => navigate("/session/config")}>
              + New Session
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Current WPM"
            value={summary.current_wpm}
            subtitle={`Baseline: ${summary.baseline_wpm} WPM`}
            trend={summary.current_wpm > summary.baseline_wpm ? "up" : "neutral"}
            accent="text-indigo-400"
          />
          <StatCard
            label="Comprehension"
            value={`${comprehensionToPercent(summary.avg_comprehension / 33.3)}%`}
            subtitle="Average accuracy"
            trend={summary.avg_comprehension >= 66 ? "up" : "down"}
          />
          <StatCard label="Level" value={`L${summary.current_level}`} subtitle="Difficulty level" />
          <StatCard label="Streak" value={summary.streak_days} subtitle="days in a row" />
        </div>

        {/* Recommendation */}
        {summary.recommended_wpm > 0 && (
          <RecommendationCard
            recommendedWpm={summary.recommended_wpm}
            recommendedDomain={summary.recommended_domain}
            currentWpm={summary.current_wpm}
            currentLevel={summary.current_level}
          />
        )}

        {/* Metronome Drills promo card */}
        <div className="relative rounded-2xl border border-white/10 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-violet-950/40 to-cyan-950/60 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.12),transparent_60%)] pointer-events-none" />

          <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🥁</span>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Subvocalization Training</p>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">Metronome Drills</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                Kill your inner voice. High-speed visual processing drills (500–800 WPM) train your eyes
                to bypass phonetic relay and read at elite speed.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                {[
                  { icon: "👁️", text: "3 speed tiers" },
                  { icon: "⚡", text: "Visual metronome flash" },
                  { icon: "🧠", text: "15 drill texts" },
                ].map(({ icon, text }) => (
                  <span key={text} className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span>{icon}</span>{text}
                  </span>
                ))}
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/25 whitespace-nowrap"
              onClick={() => navigate("/drills/metronome")}
            >
              Start Drills →
            </Button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-3 w-full min-w-0 overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-300">WPM Trend</h2>
            <WpmChart data={summary.wpm_trend} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-3 w-full min-w-0 overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-300">Accuracy by Domain</h2>
            <AccuracyChart data={summary.domain_accuracy} />
          </div>
        </div>

        {/* Advanced Diagnostics & Performance Heatmaps */}
        <AdvancedDiagnostics summary={summary} />

        {/* Weak domains */}
        {summary.weak_domains.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Performance Alert
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Accuracy in <span className="text-amber-200 font-bold">{summary.weak_domains.map(formatDomain).join(", ")}</span> is significantly below your average.
              </p>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-amber-400/10 border-amber-400/20 text-amber-300 hover:bg-amber-400/20"
              onClick={() => navigate("/session/config", { state: { drillDomain: summary.weak_domains[0] } })}
            >
              Drill {formatDomain(summary.weak_domains[0])} →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
