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
import { wpmToIntervalMs } from "@/lib/utils";
import { DRILL_TIERS } from "@/lib/drillTexts";
import type { DrillTier, DrillText } from "@/lib/drillTexts";
import Button from "@/components/shared/Button";
import { useUIStore } from "@/store";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "select" | "ready" | "running" | "comprehension" | "done";

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

function renderOrp(words: string[], tierId: string) {
  if (words.length === 0) return null;

  const firstWord = words[0];
  const otherWords = words.slice(1).join(" ");

  // Calculate ORP index (approx 30% of length, with minimum of 1 and max of floor(length / 2))
  const orpLen = Math.max(1, Math.min(Math.floor(firstWord.length / 2), Math.round(firstWord.length * 0.3)));
  const orpPart = firstWord.substring(0, orpLen);
  const restPart = firstWord.substring(orpLen);

  const orpColorClass: Record<string, string> = {
    tier1: "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]",
    tier2: "text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]",
    tier3: "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]",
  };

  return (
    <span>
      {/* First Word with ORP highlight */}
      <span className="font-extrabold">
        <span className={orpColorClass[tierId] ?? "text-indigo-400"}>{orpPart}</span>
        <span className="text-white">{restPart}</span>
      </span>
      {/* Rest of the chunk */}
      {otherWords && (
        <span className="text-white/60 font-medium">{" "}{otherWords}</span>
      )}
    </span>
  );
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
  duration: 20 | 40 | 60;
  onChangeDuration: (d: 20 | 40 | 60) => void;
}

function TierSelector({ onSelect, duration, onChangeDuration }: TierSelectorProps) {
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
              { icon: "⚡", label: "Beat the Limit", desc: "Forcing pacing at high speed breaks subvocalization, forcing visual mapping." },
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

        {/* Duration Selector */}
        <div className="space-y-3 bg-white/3 border border-white/8 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Select training duration</p>
          <div className="grid grid-cols-3 gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5 w-full">
            {([20, 40, 60] as const).map((d) => (
              <button
                key={d}
                onClick={() => onChangeDuration(d)}
                className={cn(
                  "py-2.5 rounded-lg text-xs font-semibold transition-all text-center w-full",
                  duration === d
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {d} Seconds
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 italic text-center">Scientific Pacing: 40-second visual focus bursts prevent eye fatigue while building stable eye-tracking muscles.</p>
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
                  "w-full text-left px-4 py-5 rounded-2xl border transition-all duration-200 space-y-3",
                  tierBg[tier.id]
                )}
                id={`drill-tier-${tier.id}`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className={cn("text-sm sm:text-base font-black tracking-tight", tierAccent[tier.id])}>
                    {tier.label}
                  </span>
                  <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 tabular-nums", tierBadge[tier.id])}>
                    {tier.targetWpm} WPM
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{tier.hint}</p>
                <p className="text-[10px] text-slate-600 font-medium">
                  {tier.texts.length} academic drill texts · 2-word chunks
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

// ── Drill Result Card ─────────────────────────────────────────────────────────

interface ResultCardProps {
  tier: DrillTier;
  beatCount: number;
  wordCount: number;
  elapsedMs: number;
  recallCorrect: boolean;
  onNext: () => void;
  onChangeTier: () => void;
  onReplay: () => void;
}

function DrillResultCard({ tier, beatCount, wordCount, elapsedMs, recallCorrect, onNext, onChangeTier, onReplay }: ResultCardProps) {
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

        {/* Active Recall Badge */}
        <div className="flex justify-center pt-1">
          {recallCorrect ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              🧠 Recall: Success
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
              🧠 Recall: Insufficient
            </span>
          )}
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
          {!recallCorrect
            ? "Your eyes moved fast, but the brain skipped visual decoding. Slow down slightly or focus on absolute visual acquisition."
            : actualWpm >= tier.targetWpm - 10
            ? "Excellent WPM pacing and active semantic retention! Your visual cortex is fully adapting."
            : "Perfect recall check! Keep practicing to lock in WPM pacing with repetition."}
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
  duration: 20 | 40 | 60;
  onDone: (elapsedMs: number, beatCount: number, totalWords: number, lastDrill: DrillText) => void;
  onBack: () => void;
}

function DrillRunner({ tier, drill, duration, onDone, onBack }: DrillRunnerProps) {
  const [currentDrill, setCurrentDrill] = useState<DrillText>(drill);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [isPaused, setIsPaused] = useState(false);

  const beatCountRef = useRef(0);
  const totalWordsReadRef = useRef(0);
  const drillTextsPool = useRef(tier.texts);
  const currentDrillIndexRef = useRef(tier.texts.findIndex((t) => t.id === drill.id));

  const chunks = useMemo(() => chunkText(currentDrill.text, tier.chunkSize), [currentDrill, tier.chunkSize]);
  const intervalMs = useMemo(() => wpmToIntervalMs(tier.targetWpm, tier.chunkSize), [tier]);
  const [currentChunk, setCurrentChunk] = useState(0);

  const stateRef = useRef({
    isPaused,
    currentChunkIndex,
    chunksLength: chunks.length,
    intervalMs,
    currentDrill,
  });

  useEffect(() => {
    stateRef.current = {
      isPaused,
      currentChunkIndex,
      chunksLength: chunks.length,
      intervalMs,
      currentDrill,
    };
  });

  // Metronome pacing ticking loop
  useEffect(() => {
    if (isPaused) return;

    let lastTime = performance.now();
    let timerId: ReturnType<typeof setTimeout>;

    const runTick = () => {
      const { chunksLength, currentChunkIndex: currIdx } = stateRef.current;
      beatCountRef.current += 1;

      if (currIdx >= chunksLength - 1) {
        // Add words read of completed text
        totalWordsReadRef.current += stateRef.current.currentDrill.wordCount;

        // Loop to next text
        const nextIdx = (currentDrillIndexRef.current + 1) % drillTextsPool.current.length;
        currentDrillIndexRef.current = nextIdx;
        const nextDrill = drillTextsPool.current[nextIdx];

        setCurrentDrill(nextDrill);
        setCurrentChunkIndex(0);
      } else {
        setCurrentChunkIndex((prev) => prev + 1);
      }

      const now = performance.now();
      const drift = now - lastTime - intervalMs;
      lastTime = now;

      timerId = setTimeout(runTick, Math.max(0, intervalMs - drift));
    };

    timerId = setTimeout(runTick, intervalMs);
    return () => clearTimeout(timerId);
  }, [isPaused, intervalMs]);

  // Countdown timer loop (1 second interval)
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Complete drill
          const proportionRead = Math.round((stateRef.current.currentChunkIndex / stateRef.current.chunksLength) * stateRef.current.currentDrill.wordCount);
          const finalWords = totalWordsReadRef.current + proportionRead;
          onDone(duration * 1000, beatCountRef.current, finalWords, stateRef.current.currentDrill);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, duration, onDone]);

  // Sync index for rendering ORP chunk
  useEffect(() => {
    setCurrentChunk(currentChunkIndex);
  }, [currentChunkIndex]);

  const handlePauseResume = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const progressPercent = Math.round(((duration - timeLeft) / duration) * 100);

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

        <div className="flex items-center justify-between px-3 sm:px-6 h-11 gap-2">
          <button
            onClick={onBack}
            className="group flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-md text-xs font-bold"
          >
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 tabular-nums", tierBadge[tier.id])}>
              <span>⌛ {timeLeft}s remaining</span>
              <span>·</span>
              <span>{tier.targetWpm} WPM</span>
            </span>
          </div>

          <button
            onClick={handlePauseResume}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-bold transition-all duration-300 shadow-md",
              isPaused
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/35 hover:border-indigo-500/50 shadow-indigo-500/10 animate-pulse scale-[1.03]"
                : "bg-slate-900/60 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20"
            )}
          >
            {isPaused ? (
              <>
                <svg className="w-3.5 h-3.5 fill-current text-indigo-400" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Resume</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 fill-current text-slate-400" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span>Pause</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Text display */}
      <div className="flex-1 flex items-center justify-center pt-24 pb-24 px-6 sm:px-12 overflow-hidden">
        <div className="w-full max-w-xl text-center relative py-12 px-6 sm:px-12 min-h-[160px] flex flex-col justify-center items-center rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-sm transition-all duration-300">
          {/* Corner Brackets */}
          <div className={cn("absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg transition-colors duration-500", {
            "border-indigo-500/40": tier.id === "tier1",
            "border-violet-500/40": tier.id === "tier2",
            "border-cyan-500/40": tier.id === "tier3",
          })} />
          <div className={cn("absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg transition-colors duration-500", {
            "border-indigo-500/40": tier.id === "tier1",
            "border-violet-500/40": tier.id === "tier2",
            "border-cyan-500/40": tier.id === "tier3",
          })} />
          <div className={cn("absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-lg transition-colors duration-500", {
            "border-indigo-500/40": tier.id === "tier1",
            "border-violet-500/40": tier.id === "tier2",
            "border-cyan-500/40": tier.id === "tier3",
          })} />
          <div className={cn("absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-lg transition-colors duration-500", {
            "border-indigo-500/40": tier.id === "tier1",
            "border-violet-500/40": tier.id === "tier2",
            "border-cyan-500/40": tier.id === "tier3",
          })} />

          {/* Rhythmic Horizontal Tracking Guide */}
          <div className="absolute inset-x-12 bottom-4 h-[2px] overflow-hidden rounded-full bg-white/5">
            <div className={cn("h-full w-full transition-colors duration-500 opacity-20 shadow-[0_0_8px_currentColor]", {
              "bg-indigo-500 text-indigo-500": tier.id === "tier1",
              "bg-violet-500 text-violet-500": tier.id === "tier2",
              "bg-cyan-500 text-cyan-500": tier.id === "tier3",
            })} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentChunk}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: Math.min(intervalMs * 0.25 / 1000, 0.1), ease: "easeOut" }}
              className="text-white font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-relaxed tracking-wide select-none"
            >
              {renderOrp(chunks[currentChunk]?.words ?? [], tier.id)}
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

// ── Comprehension Screen (5-second rapid active recall check) ────────────────

interface ComprehensionScreenProps {
  tier: DrillTier;
  drill: DrillText;
  onComplete: (isCorrect: boolean) => void;
}

function ComprehensionScreen({ tier, drill, onComplete }: ComprehensionScreenProps) {
  const [timeLeft, setTimeLeft] = useState(7);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<Array<{ text: string; originalIndex: number }>>([]);
  const { question } = drill;

  useEffect(() => {
    if (selectedIdx !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete(false); // Auto-fail on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete, selectedIdx]);

  useEffect(() => {
    const mapped = question.options.map((text, index) => ({ text, originalIndex: index }));
    const shuffled = [...mapped];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledOptions(shuffled);
  }, [drill.id, question.options]);

  const handleSelect = (index: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(index);
    setTimeout(() => {
      onComplete(index === question.correctIndex);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Rapid Recall Timer */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-2 border-white/10 bg-white/3">
            <span className={cn("text-2xl font-black tabular-nums", tierAccent[tier.id])}>
              {timeLeft}
            </span>
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <motion.circle
                cx="32"
                cy="32"
                r="30"
                fill="transparent"
                stroke={tierAccent[tier.id] === "text-indigo-400" ? "#6366f1" : tierAccent[tier.id] === "text-violet-400" ? "#8b5cf6" : "#06b6d4"}
                strokeWidth="2"
                strokeDasharray="188"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 188 }}
                transition={{ duration: 7, ease: "linear" }}
              />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rapid Active Recall</p>
            <h2 className="text-xl font-black text-white px-2 leading-relaxed">
              {question.stem}
            </h2>
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {shuffledOptions.map((optObj, idx) => {
            const isCorrect = optObj.originalIndex === question.correctIndex;
            const isSelected = optObj.originalIndex === selectedIdx;
            const hasChosen = selectedIdx !== null;

            return (
              <motion.button
                key={idx}
                whileHover={hasChosen ? {} : { scale: 1.02 }}
                whileTap={hasChosen ? {} : { scale: 0.98 }}
                onClick={() => handleSelect(optObj.originalIndex)}
                className={cn(
                  "w-full py-4 px-6 rounded-2xl border text-sm font-bold transition-all text-center",
                  !hasChosen
                    ? "border-white/10 bg-white/4 text-slate-300 hover:border-white/20 hover:text-white"
                    : isCorrect
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : isSelected
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                    : "border-white/5 bg-white/1 text-slate-500 opacity-40 pointer-events-none"
                )}
                disabled={hasChosen}
              >
                {optObj.text}
              </motion.button>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-600 font-medium">
          Answer quickly! Auto-advances in 5 seconds to train direct visual comprehension pathways.
        </p>
      </motion.div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MetronomeDrillScreen() {
  const { setFullscreen } = useUIStore();

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedTier, setSelectedTier] = useState<DrillTier | null>(null);
  const [drillIndex, setDrillIndex] = useState(0);
  const [duration, setDuration] = useState<20 | 40 | 60>(40);
  const [resultData, setResultData] = useState<{
    elapsedMs: number;
    beatCount: number;
    totalWords: number;
    lastDrill: DrillText;
  } | null>(null);
  const [recallCorrect, setRecallCorrect] = useState<boolean | null>(null);

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
    setRecallCorrect(null);
    setPhase("ready");
  }, []);

  const handleStart = useCallback(() => {
    setPhase("running");
  }, []);

  const handleDrillDone = useCallback((elapsedMs: number, beatCount: number, totalWords: number, lastDrill: DrillText) => {
    setResultData({ elapsedMs, beatCount, totalWords, lastDrill });
    setPhase("comprehension");
  }, []);

  const handleComprehensionComplete = useCallback((isCorrect: boolean) => {
    setRecallCorrect(isCorrect);
    setPhase("done");
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedTier) return;
    const totalTexts = selectedTier.texts.length;
    let nextIndex = drillIndex;
    if (totalTexts > 1) {
      do {
        nextIndex = Math.floor(Math.random() * totalTexts);
      } while (nextIndex === drillIndex);
    }
    setDrillIndex(nextIndex);
    setResultData(null);
    setRecallCorrect(null);
    setPhase("ready");
  }, [selectedTier, drillIndex]);

  const handleReplay = useCallback(() => {
    setResultData(null);
    setRecallCorrect(null);
    setPhase("ready");
  }, []);

  const handleBack = useCallback(() => {
    setSelectedTier(null);
    setResultData(null);
    setRecallCorrect(null);
    setPhase("select");
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === "select" || !selectedTier) {
    return <TierSelector onSelect={handleTierSelect} duration={duration} onChangeDuration={setDuration} />;
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
        duration={duration}
        onDone={handleDrillDone}
        onBack={handleBack}
      />
    );
  }

  if (phase === "comprehension" && resultData) {
    return (
      <ComprehensionScreen
        tier={selectedTier}
        drill={resultData.lastDrill}
        onComplete={handleComprehensionComplete}
      />
    );
  }

  if (phase === "done" && resultData && recallCorrect !== null) {
    return (
      <DrillResultCard
        tier={selectedTier}
        beatCount={resultData.beatCount}
        wordCount={resultData.totalWords}
        elapsedMs={resultData.elapsedMs}
        recallCorrect={recallCorrect}
        onNext={handleNext}
        onReplay={handleReplay}
        onChangeTier={handleBack}
      />
    );
  }

  return null;
}
