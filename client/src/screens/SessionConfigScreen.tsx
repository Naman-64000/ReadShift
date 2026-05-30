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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-24 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-10"
      >
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
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Content Domain</h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedDomain("random")}
              className={cn(
                "rounded-xl border px-3 py-3 text-sm font-medium transition-all text-center",
                selectedDomain === "random"
                  ? "border-indigo-500 bg-indigo-500/15 text-white"
                  : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-white"
              )}
            >
              🎲 Surprise Me
            </button>
            {DOMAINS.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDomain(d.value)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-medium transition-all text-center",
                  selectedDomain === d.value
                    ? "border-indigo-500 bg-indigo-500/15 text-white"
                    : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-white"
                )}
              >
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Settings Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Active Settings</h2>
            <button 
              onClick={() => navigate("/settings")}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5"
            >
              <span>⚙️</span> Change
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/4 py-4 px-2">
            <div className="grid grid-cols-3 gap-2 divide-x divide-white/10">
              <div className="px-3 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Highlight</p>
                <p className="text-sm font-semibold text-white">{chunkSize} Words</p>
              </div>
              <div className="px-3 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Guide Line</p>
                <p className={cn("text-sm font-semibold", guideEnabled ? "text-white" : "text-slate-500")}>
                  {guideEnabled ? "Enabled" : "Off"}
                </p>
              </div>
              <div className="px-3 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Text Fading</p>
                <p className={cn("text-sm font-semibold", fadingEnabled ? "text-white" : "text-slate-500")}>
                  {fadingEnabled ? "Enabled" : "Off"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

        {/* Start */}
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
