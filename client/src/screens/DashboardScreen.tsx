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
import { comprehensionToPercent, formatDomain } from "@/lib/utils";

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { summary, error, refresh } = useDashboard();

  if (!summary) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] pt-14 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading your progress…" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] pt-14 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Button variant="secondary" onClick={refresh}>Retry</Button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-14 px-4 py-10">
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300">WPM Trend</h2>
            <WpmChart data={summary.wpm_trend} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300">Accuracy by Domain</h2>
            <AccuracyChart data={summary.domain_accuracy} />
          </div>
        </div>

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
