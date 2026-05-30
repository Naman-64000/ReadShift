import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useSessionStore } from "@/store";
import { useDashboardStore } from "@/store";
import { useUserStore } from "@/store";
import WpmSlider from "@/components/session/WpmSlider";
import Button from "@/components/shared/Button";
import { DOMAINS, CHUNK_SIZES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import type { Domain } from "@/types";

export default function SessionConfigScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const summary = useDashboardStore((s) => s.summary);
  const prefs = useUserStore((s) => s.preferences);
  const { startSession, prefetchPassage, error, setError } = useSessionStore();

  const [targetWpm, setTargetWpm] = useState(
    summary?.recommended_wpm ?? 280
  );
  const [calibratedWpm, setCalibratedWpm] = useState<number | null>(null);
  const [chunkSize, setChunkSize] = useState<3 | 4>(prefs?.chunk_size ?? 3);
  const [fadingEnabled, setFadingEnabled] = useState(prefs?.fading_enabled ?? false);
  const [guideEnabled, setGuideEnabled] = useState(prefs?.guide_enabled ?? true);
  const [selectedDomain, setSelectedDomain] = useState<Domain | "random">(
    (location.state?.drillDomain as Domain) || "random"
  );
  const [isStarting, setIsStarting] = useState(false);

  // Background pre-fetch on mount
  useEffect(() => {
    prefetchPassage(selectedDomain === "random" ? undefined : selectedDomain);
  }, [prefetchPassage, selectedDomain]);

  useEffect(() => {
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
          setTargetWpm(baseline);
        }
      } catch {
        // fallback to default 280
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
            onChange={setTargetWpm}
            recommendedWpm={summary?.recommended_wpm ?? calibratedWpm ?? undefined}
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

        {/* Reading Aids */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Reading Aids</h2>
          <div className="rounded-2xl border border-white/10 bg-white/4 divide-y divide-white/8">
            {/* Chunk size */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">Chunk Size</p>
                <p className="text-xs text-slate-500">Words highlighted at once</p>
              </div>
              <div className="flex gap-2">
                {CHUNK_SIZES.map((cs) => (
                  <button
                    key={cs.value}
                    onClick={() => setChunkSize(cs.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      chunkSize === cs.value
                        ? "bg-indigo-500 text-white"
                        : "bg-white/8 text-slate-400 hover:text-white"
                    )}
                  >
                    {cs.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Pacing guide */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">Pacing Guide</p>
                <p className="text-xs text-slate-500">Horizontal line to follow along</p>
              </div>
              <button
                onClick={() => setGuideEnabled(!guideEnabled)}
                className={cn(
                  "relative h-6 w-10 rounded-full transition-colors",
                  guideEnabled ? "bg-indigo-500" : "bg-white/15"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  guideEnabled ? "translate-x-4.5" : "translate-x-0.5"
                )} />
              </button>
            </div>

            {/* Fading */}
            <div className={cn(
              "flex items-center justify-between px-5 py-4 transition-opacity",
              (summary?.sessions_completed ?? 0) < 10 && "opacity-50"
            )}>
              <div>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  Text Fading
                  {(summary?.sessions_completed ?? 0) < 10 && (
                    <span className="text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      🔒 Unlocks at 10 sessions
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">Read text fades — trains forward momentum</p>
              </div>
              <button
                disabled={(summary?.sessions_completed ?? 0) < 10}
                onClick={() => setFadingEnabled(!fadingEnabled)}
                className={cn(
                  "relative h-6 w-10 rounded-full transition-colors",
                  fadingEnabled ? "bg-indigo-500" : "bg-white/15",
                  (summary?.sessions_completed ?? 0) < 10 && "cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  fadingEnabled ? "translate-x-4.5" : "translate-x-0.5"
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error === "POOL_EXHAUSTED"
              ? "No more passages available for this domain — try a different one."
              : error}
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
