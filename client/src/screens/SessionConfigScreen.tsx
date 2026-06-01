import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/store";
import { useDashboardStore } from "@/store";
import { useUserStore } from "@/store";
import WpmSlider from "@/components/session/WpmSlider";
import Button from "@/components/shared/Button";
import { DOMAINS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import type { Domain } from "@/types";

export default function SessionConfigScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const summary = useDashboardStore((s) => s.summary);
  const fetchSummary = useDashboardStore((s) => s.fetchSummary);
  const prefs = useUserStore((s) => s.preferences);
  const { startSession, prefetchPassage, error, setError, lastSelectedWpm, setLastSelectedWpm } = useSessionStore();

  const [targetWpm, setTargetWpm] = useState(
    lastSelectedWpm ?? summary?.recommended_wpm ?? 220
  );
  const [calibratedWpm, setCalibratedWpm] = useState<number | null>(null);
  
  const chunkSize = prefs?.chunk_size ?? 3;
  const fadingEnabled = prefs?.fading_enabled ?? false;
  const guideEnabled = prefs?.guide_enabled ?? true;

  const [selectedDomain, setSelectedDomain] = useState<Domain | "random">(
    (location.state?.drillDomain as Domain) || "random"
  );
  const [isStarting, setIsStarting] = useState(false);
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await apiClient.get<{ data: Record<string, number> }>("/sessions/domain-status");
        setDomainCounts(res.data.data);
      } catch (err) {
        console.error("Failed to fetch domain statuses:", err);
      }
    };
    void fetchCounts();
  }, []);

  // Background pre-fetch on mount (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchPassage(selectedDomain === "random" ? undefined : selectedDomain);
    }, 300);
    return () => clearTimeout(timer);
  }, [prefetchPassage, selectedDomain]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (lastSelectedWpm) return; // Don't override if user has manually selected

    if (summary?.recommended_wpm) {
      setTargetWpm(summary.recommended_wpm);
      return;
    }
    const loadCalibration = async () => {
      try {
        const res = await apiClient.get<{ data: { average_wpm?: number } | null }>("/calibrations/latest");
        const baseline = res.data.data?.average_wpm ?? null;
        if (baseline) {
          setCalibratedWpm(baseline);
          setTargetWpm(Math.min(500, Math.round((baseline + 20) / 10) * 10));
        } else {
          setTargetWpm(220);
        }
      } catch {
        setTargetWpm(220);
      }
    };
    void loadCalibration();
  }, [summary?.recommended_wpm]);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    await startSession({
      target_wpm: targetWpm,
      chunk_size: chunkSize,
      fading_enabled: fadingEnabled,
      guide_enabled: guideEnabled,
      domain: selectedDomain === "random" ? undefined : selectedDomain,
    });
    setIsStarting(false);
    // Only navigate if no error
    const storeError = useSessionStore.getState().error;
    if (!storeError) navigate("/session/reading");
  };

  const allowedDomains = prefs?.domains ?? [];
  const drillDomain = location.state?.drillDomain as string | undefined;
  const filteredDomains = allowedDomains.length > 0
    ? DOMAINS.filter((d) => allowedDomains.includes(d.value) || d.value === drillDomain)
    : DOMAINS;

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 flex items-center justify-center px-4 py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-5"
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white">Configure Session</h1>
          <p className="text-slate-400 text-sm">Set your pace and preferences for this reading session.</p>
        </div>

        {/* WPM Slider */}
        <div className="rounded-2xl border border-white/10 bg-white/4 p-6">
          <WpmSlider
            value={targetWpm}
            onChange={(val) => {
              setTargetWpm(val);
              setLastSelectedWpm(val);
            }}
            recommendedWpm={summary?.recommended_wpm ?? (calibratedWpm ? Math.min(500, Math.round((calibratedWpm + 20) / 10) * 10) : undefined)}
          />
        </div>

        {/* Domain */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-0.5">Content Domain</h2>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => setSelectedDomain("random")}
              className={cn(
                "rounded-xl border py-3.5 px-3 text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5",
                selectedDomain === "random"
                  ? "border-indigo-500 bg-indigo-500/15 text-white"
                  : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-white"
              )}
            >
              🎲 Surprise Me
            </button>
            {filteredDomains.map((d) => {
              const count = domainCounts[d.value];
              const isExhausted = count === 0;
              return (
                <button
                  key={d.value}
                  title={isExhausted ? "All new passages read. Selecting this will recycle a previously read passage." : undefined}
                  onClick={() => setSelectedDomain(d.value)}
                  className={cn(
                    "rounded-xl border py-3.5 px-3 text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 select-none",
                    selectedDomain === d.value
                      ? "border-indigo-500 bg-indigo-500/15 text-white"
                      : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-white"
                  )}
                >
                  <span>{d.emoji}</span>
                  <span className="hidden sm:inline">{d.label}</span>
                  <span className="sm:hidden">{d.label.slice(0, 5)}..</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Settings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-0.5">Active Settings</h2>
            <button
              onClick={() => navigate("/settings")}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              ⚙️ Edit
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap px-0.5">
            {/* Chunk size (always active) */}
            <span className="inline-flex items-center text-[11px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full">
              {chunkSize}w chunks
            </span>

            {/* Guide line */}
            <span className={cn(
              "inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all",
              guideEnabled
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : "text-slate-600 bg-transparent border-white/5"
            )}>
              📏 {guideEnabled ? "Guide on" : "Guide off"}
            </span>

            {/* Text Fading */}
            <span className={cn(
              "inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all",
              fadingEnabled
                ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                : "text-slate-600 bg-transparent border-white/5"
            )}>
              🌫 {fadingEnabled ? "Fading on" : "Fading off"}
            </span>

            {/* Pacing Mode */}
            <span className={cn(
              "inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all",
              (prefs?.laap_enabled ?? true)
                ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                : "text-slate-600 bg-transparent border-white/5"
            )}>
              {(prefs?.laap_enabled ?? true) ? "⚡ Adaption" : "— Linear"}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p>
              {error === "POOL_EXHAUSTED"
                ? "No more passages available for this domain."
                : error}
            </p>
            {error === "POOL_EXHAUSTED" && selectedDomain !== "random" && (
              <Button size="sm" variant="secondary" className="border-red-400/20 text-red-300 hover:bg-red-400/10 shrink-0" onClick={() => setSelectedDomain("random")}>
                🎲 Surprise Me Instead
              </Button>
            )}
          </div>
        )}

        {/* Start — inline, always visible */}
        <Button
          size="lg"
          className="w-full"
          isLoading={isStarting}
          onClick={handleStart}
        >
          {isStarting ? "Loading passage…" : "Start Reading →"}
        </Button>
      </motion.div>
    </div>
  );
}

