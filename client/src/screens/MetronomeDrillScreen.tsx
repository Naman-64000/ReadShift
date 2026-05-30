/**
 * client/src/screens/MetronomeDrillScreen.tsx
 *
 * Subvocalization Metronome Drills — a dedicated high-speed visual processing
 * training mode.
 *
 * Experience flow:
 *  1. Tier Selector  — user picks a speed tier (500 / 650 / 800 WPM)
 *  2. Drill Runner   — full-screen reading with a live visual metronome flash
 *  3. Result Card    — beats completed, actual WPM, and next-step CTAs
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import { wpmToIntervalMs } from "@/lib/utils";
import { DRILL_TIERS } from "@/lib/drillTexts";
import type { DrillTier, DrillText } from "@/lib/drillTexts";
import Button from "@/components/shared/Button";
import { useUIStore } from "@/store";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "select" | "ready" | "running" | "done";

interface DrillChunk {
  words: string[];
}

// ── Utilities ────────────────────────────────────────────────────────────────

function chunkText(text: string, size: number): DrillChunk[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: DrillChunk[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push({ words: words.slice(i, i + size) });
  }
  return chunks;
}

function calcActualWpm(wordCount: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.round((wordCount / elapsedMs) * 60_000);
}

// ── Tier card colors ─────────────────────────────────────────────────────────

const tierBg: Record<DrillTier["id"], string> = {
  tier1: "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50",
  tier2: "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/50",
  tier3: "border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50",
};
const tierAccent: Record<DrillTier["id"], string> = {
  tier1: "text-indigo-400",
  tier2: "text-violet-400",
  tier3: "text-cyan-400",
};
const tierBadge: Record<DrillTier["id"], string> = {
  tier1: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  tier2: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  tier3: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};
const metronomeColor: Record<DrillTier["id"], string> = {
  tier1: "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.35)]",
  tier2: "border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.35)]",
  tier3: "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.35)]",
};
const metronomeDotColor: Record<DrillTier["id"], string> = {
  tier1: "bg-indigo-400",
  tier2: "bg-violet-400",
  tier3: "bg-cyan-400",
};
const metronomePulse: Record<DrillTier["id"], string> = {
  tier1: "rgba(99,102,241,0.6)",
  tier2: "rgba(139,92,246,0.6)",
  tier3: "rgba(6,182,212,0.6)",
};

// ── Visual Metronome Flash ────────────────────────────────────────────────────

interface MetronomeProps {
  tier: DrillTier;
  beatCount: number;
  intervalMs: number;
}

function MetronomeFlash({ tier, beatCount, intervalMs }: MetronomeProps) {
  const flashDuration = Math.min(intervalMs * 0.55, 260);

  return (
    <div className="fixed bottom-8 right-6 sm:bottom-10 sm:right-10 z-50 flex flex-col items-center gap-2 pointer-events-none select-none">
      {/* Beat count */}
      <div className={cn("text-[10px] font-black uppercase tracking-widest tabular-nums", tierAccent[tier.id])}>
        {beatCount.toString().padStart(3, "0")}
      </div>

      {/* Outer ring + inner dot */}
      <AnimatePresence mode="wait">
        <motion.div
          key={beatCount}
          initial={{ scale: 1.35, opacity: 0.3 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: flashDuration / 1000, ease: "easeOut" }}
          className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center",
            metronomeColor[tier.id]
          )}
        >
          <motion.div
            key={`dot-${beatCount}`}
            initial={{ scale: 1.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: flashDuration / 1000, ease: "easeOut" }}
            className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-full", metronomeDotColor[tier.id])}
            style={{ boxShadow: `0 0 12px ${metronomePulse[tier.id]}` }}
          />
        </motion.div>
      </AnimatePresence>

      {/* WPM label */}
      <div className={cn("text-[10px] font-bold uppercase tracking-widest", tierAccent[tier.id])}>
        {tier.targetWpm} WPM
      </div>
    </div>
  );
}

// ── Tier Selector ─────────────────────────────────────────────────────────────

interface TierSelectorProps {
  onSelect: (tier: DrillTier) => void;
}

function TierSelector({ onSelect }: TierSelectorProps) {
  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16 px-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Subvocalization Training
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            Metronome Drills
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Train your eyes to capture words without sounding them out. Follow the beat.
            Kill the inner voice.
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: "👁️", label: "Visual Only", desc: "Watch the flashing metronome ring sync with each word chunk" },
              { icon: "🔇", label: "No Phonetics", desc: "Don't sound words out — let your visual cortex absorb the meaning directly" },
              { icon: "⚡", label: "Beat the Limit", desc: "500–800 WPM is too fast for subvocalization. Your brain adapts." },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-xl mt-0.5 shrink-0">{icon}</span>
                <div>
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Choose your speed</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DRILL_TIERS.map((tier) => (
              <motion.button
                key={tier.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(tier)}
                className={cn(
                  "w-full text-left p-5 rounded-2xl border transition-all duration-200 space-y-3",
                  tierBg[tier.id]
                )}
                id={`drill-tier-${tier.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-lg font-black", tierAccent[tier.id])}>
                    {tier.label}
                  </span>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", tierBadge[tier.id])}>
                    {tier.targetWpm} WPM
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{tier.hint}</p>
                <p className="text-[10px] text-slate-600 font-medium">
                  {tier.texts.length} drill texts · 2-word chunks
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Ready Screen (countdown + tip) ──────────────────────────────────────────

interface ReadyScreenProps {
  tier: DrillTier;
  drill: DrillText;
  onStart: () => void;
  onBack: () => void;
}

function ReadyScreen({ tier, drill, onStart, onBack }: ReadyScreenProps) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          onStart();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onStart]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center gap-8">
      {/* Countdown ring */}
      <motion.div
        key={countdown}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "w-28 h-28 rounded-full border-4 flex items-center justify-center",
          metronomeColor[tier.id]
        )}
      >
        <span className="text-5xl font-black text-white tabular-nums">{countdown}</span>
      </motion.div>

      <div className="space-y-2">
        <p className={cn("text-xs font-bold uppercase tracking-widest", tierAccent[tier.id])}>
          {tier.label} · {tier.targetWpm} WPM
        </p>
        <p className="text-white font-semibold text-base">{tier.hint}</p>
        <p className="text-slate-500 text-xs">{drill.wordCount} words · {tier.chunkSize}-word chunks</p>
      </div>

      <button
        onClick={onBack}
        className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Drill Result Card ─────────────────────────────────────────────────────────

interface ResultCardProps {
  tier: DrillTier;
  beatCount: number;
  wordCount: number;
  elapsedMs: number;
  onNext: () => void;
  onChangeTier: () => void;
  onReplay: () => void;
}

function DrillResultCard({ tier, beatCount, wordCount, elapsedMs, onNext, onChangeTier, onReplay }: ResultCardProps) {
  const actualWpm = calcActualWpm(wordCount, elapsedMs);
  const wpmDiff = actualWpm - tier.targetWpm;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6 text-center"
      >
        {/* Trophy */}
        <div className="text-5xl">🎯</div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Drill Complete!</h2>
          <p className={cn("text-sm font-semibold", tierAccent[tier.id])}>
            {tier.label} · {tier.targetWpm} WPM
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 bg-white/4 border border-white/8 rounded-2xl p-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Beats</p>
            <p className="text-xl font-black text-white mt-1 tabular-nums">{beatCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Actual WPM</p>
            <p className={cn("text-xl font-black mt-1 tabular-nums", tierAccent[tier.id])}>{actualWpm}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">vs Target</p>
            <p className={cn("text-xl font-black mt-1 tabular-nums", wpmDiff >= -10 ? "text-emerald-400" : "text-amber-400")}>
              {wpmDiff >= 0 ? "+" : ""}{wpmDiff}
            </p>
          </div>
        </div>

        {/* Feedback message */}
        <p className="text-sm text-slate-400 leading-relaxed">
          {actualWpm >= tier.targetWpm - 10
            ? "Excellent rhythm! Your visual cortex is adapting. Try the next drill or push faster."
            : "Keep going — the pattern locks in with repetition. Same drill again or reset."}
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Button id="drill-next" onClick={onNext} className="w-full justify-center font-bold">
            Next Drill Text →
          </Button>
          <Button id="drill-replay" variant="secondary" onClick={onReplay} className="w-full justify-center">
            🔄 Replay Same Text
          </Button>
          <Button id="drill-change-tier" variant="ghost" onClick={onChangeTier} className="w-full justify-center text-slate-400">
            ← Change Speed Tier
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Drill Runner ──────────────────────────────────────────────────────────────

interface DrillRunnerProps {
  tier: DrillTier;
  drill: DrillText;
  onDone: (elapsedMs: number, beatCount: number) => void;
  onBack: () => void;
}

function DrillRunner({ tier, drill, onDone, onBack }: DrillRunnerProps) {
  const chunks = useMemo(() => chunkText(drill.text, tier.chunkSize), [drill, tier.chunkSize]);
  const intervalMs = useMemo(() => wpmToIntervalMs(tier.targetWpm, tier.chunkSize), [tier]);
  const beatCountRef = useRef(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);

  const handleComplete = useCallback((elapsed: number) => {
    onDone(elapsed, beatCountRef.current);
  }, [onDone]);

  const { currentChunkIndex, pause, resume } = useReadingTimer({
    totalChunks: chunks.length,
    intervalMs,
    onComplete: handleComplete,
    autoStart: true,
  });

  // Track beat count (each chunk advance = one beat)
  useEffect(() => {
    beatCountRef.current = currentChunkIndex;
    setCurrentChunk(currentChunkIndex);
  }, [currentChunkIndex]);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resume();
      setIsPaused(false);
    } else {
      pause();
      setIsPaused(true);
    }
  }, [isPaused, pause, resume]);

  const progressPercent = chunks.length > 0 ? Math.round((currentChunkIndex / chunks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative">
      {/* Top HUD */}
      <div className="fixed top-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur border-b border-white/8">
        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/5 overflow-hidden">
          <motion.div
            className={cn("h-full", {
              "bg-indigo-500": tier.id === "tier1",
              "bg-violet-500": tier.id === "tier2",
              "bg-cyan-500": tier.id === "tier3",
            })}
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 h-11 gap-2">
          <button
            onClick={onBack}
            className="text-xs font-semibold px-2 sm:px-3 py-1 rounded-lg transition-colors bg-white/8 text-slate-300 hover:text-white"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", tierBadge[tier.id])}>
              {tier.label} · {tier.targetWpm} WPM
            </span>
          </div>

          <button
            onClick={handlePauseResume}
            className={cn(
              "text-xs font-semibold px-2 sm:px-3 py-1 rounded-lg transition-colors whitespace-nowrap",
              isPaused
                ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                : "bg-white/8 text-slate-400 hover:text-white"
            )}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      {/* Text display */}
      <div className="flex-1 flex items-center justify-center pt-24 pb-24 px-6 sm:px-12 overflow-hidden">
        <div className="w-full max-w-xl text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentChunk}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: Math.min(intervalMs * 0.25 / 1000, 0.1), ease: "easeOut" }}
              className="text-white font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-relaxed tracking-wide select-none"
            >
              {chunks[currentChunk]?.words.join(" ") ?? ""}
            </motion.div>
          </AnimatePresence>

          {/* Beat position indicator */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {chunks.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-0.5 rounded-full transition-all duration-100",
                  i < currentChunk
                    ? "w-3 bg-white/20"
                    : i === currentChunk
                    ? cn("w-5", {
                        "bg-indigo-400": tier.id === "tier1",
                        "bg-violet-400": tier.id === "tier2",
                        "bg-cyan-400": tier.id === "tier3",
                      })
                    : "w-3 bg-white/8"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Paused overlay */}
      {isPaused && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 cursor-pointer"
          onClick={handlePauseResume}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl">⏸</div>
            <p className="text-white font-semibold">Paused</p>
            <p className="text-sm text-slate-400">Click anywhere to resume</p>
          </div>
        </div>
      )}

      {/* Visual Metronome */}
      <MetronomeFlash tier={tier} beatCount={currentChunkIndex} intervalMs={intervalMs} />
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MetronomeDrillScreen() {
  const { setFullscreen } = useUIStore();

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedTier, setSelectedTier] = useState<DrillTier | null>(null);
  const [drillIndex, setDrillIndex] = useState(0);
  const [resultData, setResultData] = useState<{ elapsedMs: number; beatCount: number } | null>(null);

  // Enter fullscreen only during running phase
  useEffect(() => {
    if (phase === "running") {
      setFullscreen(true);
    } else {
      setFullscreen(false);
    }
    return () => setFullscreen(false);
  }, [phase, setFullscreen]);

  const handleTierSelect = useCallback((tier: DrillTier) => {
    setSelectedTier(tier);
    setDrillIndex(0);
    setPhase("ready");
  }, []);

  const handleStart = useCallback(() => {
    setPhase("running");
  }, []);

  const handleDrillDone = useCallback((elapsedMs: number, beatCount: number) => {
    setResultData({ elapsedMs, beatCount });
    setPhase("done");
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedTier) return;
    const nextIndex = (drillIndex + 1) % selectedTier.texts.length;
    setDrillIndex(nextIndex);
    setResultData(null);
    setPhase("ready");
  }, [selectedTier, drillIndex]);

  const handleReplay = useCallback(() => {
    setResultData(null);
    setPhase("ready");
  }, []);

  const handleBack = useCallback(() => {
    setSelectedTier(null);
    setResultData(null);
    setPhase("select");
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === "select" || !selectedTier) {
    return <TierSelector onSelect={handleTierSelect} />;
  }

  const currentDrill = selectedTier.texts[drillIndex];

  if (phase === "ready") {
    return (
      <ReadyScreen
        tier={selectedTier}
        drill={currentDrill}
        onStart={handleStart}
        onBack={handleBack}
      />
    );
  }

  if (phase === "running") {
    return (
      <DrillRunner
        key={`${selectedTier.id}-${drillIndex}`}
        tier={selectedTier}
        drill={currentDrill}
        onDone={handleDrillDone}
        onBack={handleBack}
      />
    );
  }

  if (phase === "done" && resultData) {
    return (
      <DrillResultCard
        tier={selectedTier}
        beatCount={resultData.beatCount}
        wordCount={currentDrill.wordCount}
        elapsedMs={resultData.elapsedMs}
        onNext={handleNext}
        onReplay={handleReplay}
        onChangeTier={handleBack}
      />
    );
  }

  return null;
}
