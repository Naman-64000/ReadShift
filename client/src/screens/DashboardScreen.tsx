/**
 * client/src/screens/DashboardScreen.tsx
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

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

interface HistoryPassage {
  id: string;
  body: string;
  domain: string;
  topic_key: string | null;
  word_count: number;
}

interface HistoryItem {
  id: string;
  seen_at: string;
  passage: HistoryPassage;
  session: {
    id: string;
    actual_wpm: number;
    comprehension: number;
    completed_at: string;
    mcqs_enabled: boolean;
  } | null;
}

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { summary, error, refresh } = useDashboard();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedPassage, setSelectedPassage] = useState<HistoryPassage | null>(null);

  useEffect(() => {
    if (summary && summary.baseline_wpm === 0) {
      navigate("/onboarding");
    }
  }, [summary, navigate]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiClient.get<{ data: HistoryItem[] }>("/sessions/history");
        setHistory(res.data.data);
      } catch (err) {
        console.error("Failed to load reading history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    void fetchHistory();
  }, []);

  if (error && !summary) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-20 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Button variant="secondary" onClick={refresh}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-20 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading your progress…" />
      </div>
    );
  }



  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Your Progress</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {summary.sessions_completed} sessions completed
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
          <StatCard label="Sessions" value={summary.sessions_completed} subtitle="total completed" />
          <StatCard label="Streak" value={summary.streak_days} subtitle="days in a row" />
        </div>

        {/* Recommendation */}
        {summary.recommended_wpm > 0 && (
          <RecommendationCard
            recommendedWpm={summary.recommended_wpm}
            recommendedDomain={summary.recommended_domain}
            currentWpm={summary.current_wpm}
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
                Kill your inner voice. High-speed visual processing drills (300–500 WPM) train your eyes
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
            <div>
              <h2 className="text-sm font-bold text-slate-200">Velocity & Comprehension Evolution</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Pacing speed and comprehension accuracy over recent sessions</p>
            </div>
            <WpmChart data={summary.wpm_trend} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-3 w-full min-w-0 overflow-hidden">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Cognitive Sweet Spot Analyzer</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Comprehension accuracy mapped across pacing speed ranges</p>
            </div>
            <AccuracyChart data={summary.wpm_comprehension_correlation} />
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

        {/* Reading History Tab */}
        <section className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-4">
          <div>
            <h2 className="text-base font-black text-white">📜 Reading History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review passages you have read, started, or skipped in practice to track your progress.
            </p>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8 text-slate-500 text-xs animate-pulse">
              Loading reading history…
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-slate-500 text-xs py-6">
              No passages in your reading history yet. Start a reading session to begin!
            </p>
          ) : (
            <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
              {history.map((item) => {
                const isCompleted = item.session !== null;
                const scorePercent = isCompleted && item.session!.mcqs_enabled
                  ? Math.round((item.session!.comprehension / 3) * 100)
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0 hover:bg-white/3 transition-colors px-2 rounded-xl cursor-pointer group"
                    onClick={() => setSelectedPassage(item.passage)}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xl shrink-0 mt-0.5">
                        {DOMAIN_EMOJIS[item.passage.domain] ?? "📖"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-300 group-hover:text-indigo-400 transition-colors truncate">
                          {item.passage.topic_key ?? "Academic Reading Passage"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Started: {new Date(item.seen_at).toLocaleDateString()} at {new Date(item.seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.passage.word_count} words
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:text-right shrink-0">
                      {/* Status indicator */}
                      {!isCompleted ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                          Left in between ❌
                        </span>
                      ) : !item.session!.mcqs_enabled ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-500/15 border border-slate-500/20 text-slate-300">
                          MCQs Disabled ✓
                        </span>
                      ) : (
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                          scorePercent >= 66
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : scorePercent >= 33
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          Completed ✓ ({item.session!.comprehension}/3 correct)
                        </span>
                      )}

                      {/* WPM Display */}
                      {isCompleted && (
                        <span className="text-xs font-mono font-bold text-slate-400 min-w-[70px] text-right">
                          {item.session!.actual_wpm} WPM
                        </span>
                      )}

                      {/* View Action indicator */}
                      <span className="text-xs text-indigo-400 group-hover:translate-x-0.5 transition-transform ml-1">
                        →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {selectedPassage && (
          <HistoryPassageModal
            passage={selectedPassage}
            onClose={() => setSelectedPassage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const DOMAIN_EMOJIS: Record<string, string> = {
  business: "💼",
  science: "🔬",
  history: "📜",
  abstract: "🧩",
  social: "🌍",
};

const DOMAIN_LABELS: Record<string, string> = {
  business: "Business & Economics",
  science: "Science & Technology",
  history: "History & Culture",
  abstract: "Philosophy & Abstract",
  social: "Society & Psychology",
};

function HistoryPassageModal({
  passage,
  onClose,
}: {
  passage: HistoryPassage;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-[#0d1527] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/8">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {DOMAIN_EMOJIS[passage.domain] ?? "📖"}
              </span>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                {DOMAIN_LABELS[passage.domain] ?? passage.domain}
              </span>
            </div>
            <h3 className="text-lg font-black text-white truncate mt-0.5">
              {passage.topic_key ?? "Academic Reading Passage"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">~{passage.word_count} words</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-white text-xl font-bold leading-none transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          <div className="text-slate-200 leading-[1.85] text-[1.05rem] font-serif space-y-4 select-text text-left">
            {passage.body.split(/\n\s*\n/).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/8 flex justify-end">
          <Button size="sm" variant="secondary" onClick={onClose} className="min-w-28">
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
