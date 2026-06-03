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
import { cn, calculateLaapIntervalsMs, wpmToIntervalMs } from "@/lib/utils";
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

function buildLaapIntervals(chunks: DrillChunk[], targetWpm: number, chunkSize: number): number[] {
  if (chunks.length === 0) return [];
  const readingChunks = chunks.map((chunk, index) => ({
    words: chunk.words,
    paragraphIndex: 0,
    isParagraphStart: index === 0,
  }));
  const laapIntervals = calculateLaapIntervalsMs(readingChunks, targetWpm);
  return laapIntervals.length > 0
    ? laapIntervals
    : chunks.map((chunk) => wpmToIntervalMs(targetWpm, chunkSize || chunk.words.length));
}

function calcActualWpm(wordCount: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.round((wordCount / elapsedMs) * 60_000);
}

function renderScientificChunk(words: string[], stageId: string) {
  if (words.length === 0) return null;

  // Set up word lists for transition detection
  const contrastWords = ["however", "but", "nevertheless", "yet", "nonetheless", "conversely", "instead", "rather"];
  const additionWords = ["moreover", "furthermore", "additionally", "similarly", "likewise"];
  const conclusionWords = ["therefore", "thus", "hence", "consequently", "accordingly", "so"];

  const getWordColorClass = (word: string, stage: string) => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    if (stage === "stage1") {
      if (contrastWords.includes(clean)) return "text-rose-500 font-extrabold";
      if (additionWords.includes(clean)) return "text-cyan-400 font-extrabold";
      if (conclusionWords.includes(clean)) return "text-emerald-400 font-extrabold";
    } else if (stage === "stage2") {
      // Subtle faded colors for Stage 2
      if (contrastWords.includes(clean) || additionWords.includes(clean) || conclusionWords.includes(clean)) {
        return "text-indigo-300 font-bold border-b border-indigo-500/20"; // subtle slate-indigo accent
      }
    }
    return "";
  };

  // Stage 1: Single-word RSVP with flashy ORP highlighting
  if (stageId === "stage1") {
    const word = words[0];
    const colorClass = getWordColorClass(word, stageId) || "text-rose-400 font-extrabold";

    // Standard ORP calculation
    const orpLen = Math.max(1, Math.min(Math.floor(word.length / 2), Math.round(word.length * 0.3)));
    const orpPart = word.substring(0, orpLen);
    const restPart = word.substring(orpLen);

    return (
      <span className="font-extrabold">
        <span className={colorClass}>{orpPart}</span>
        <span className="text-white">{restPart}</span>
      </span>
    );
  }

  // Stage 2: 2-word phrase chunks, subtle colors, no ORP
  if (stageId === "stage2") {
    return (
      <span className="space-x-2">
        {words.map((w, idx) => {
          const colorClass = getWordColorClass(w, stageId);
          return (
            <span key={idx} className={cn("text-white font-medium", colorClass)}>
              {w}
            </span>
          );
        })}
      </span>
    );
  }

  // Stage 3: Centered stark RSVP, black text / high-contrast
  if (stageId === "stage3") {
    return (
      <span className="text-stone-900 font-semibold tracking-wide space-x-2">
        {words.join(" ")}
      </span>
    );
  }

  // Default fallback (Stage 4 / 5 shouldn't use RSVP centered container chunk, but in case)
  return <span>{words.join(" ")}</span>;
}

// ── Tier card colors ─────────────────────────────────────────────────────────

const tierBg: Record<DrillTier["id"], string> = {
  stage1: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-750",
  stage2: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-750",
  stage3: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-750",
};
const tierAccent: Record<DrillTier["id"], string> = {
  stage1: "text-rose-400",
  stage2: "text-cyan-400",
  stage3: "text-emerald-400",
};
const tierBadge: Record<DrillTier["id"], string> = {
  stage1: "bg-rose-950/30 text-rose-400 border-rose-900/30",
  stage2: "bg-cyan-950/30 text-cyan-400 border-cyan-900/30",
  stage3: "bg-emerald-950/30 text-emerald-400 border-emerald-900/30",
};
const metronomeColor: Record<DrillTier["id"], string> = {
  stage1: "border-rose-950 shadow-sm",
  stage2: "border-stone-800 shadow-sm", // Stark gray ring
  stage3: "border-transparent",
};
const metronomeDotColor: Record<DrillTier["id"], string> = {
  stage1: "bg-rose-500",
  stage2: "bg-stone-300", // Stark neutral dot
  stage3: "bg-transparent",
};
const metronomePulse: Record<DrillTier["id"], string> = {
  stage1: "transparent",
  stage2: "transparent",
  stage3: "transparent",
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
    <div className="min-h-screen pt-20 pb-16 px-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            Visual Pacing Practice
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[rgb(var(--text))] leading-tight">
            Metronome Drills
          </h1>
          <p className="text-stone-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Train direct word recognition at a fixed pace while the highlight timing adapts to word complexity.
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 space-y-3">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: "1", label: "Read by beat", desc: "Track each chunk with a fixed target WPM while timing adapts to the words" },
              { icon: "2", label: "Different words, different weight", desc: "Longer words, syllables, and sentence transitions get slightly more time" },
              { icon: "3", label: "Stay in rhythm", desc: "The total pace stays locked while the timing shifts within the chunk sequence" },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 h-6 w-6 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] font-black text-stone-300">{icon}</span>
                <div>
                  <p className="text-xs font-semibold text-[rgb(var(--text))]">{label}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Selector */}
        <div className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center">Select practice duration</p>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700 w-full">
            {([20, 40, 60] as const).map((d) => (
              <button
                key={d}
                onClick={() => onChangeDuration(d)}
                className={cn(
                  "py-2.5 rounded-lg text-xs font-semibold transition-all text-center w-full",
                  duration === d
                    ? "bg-stone-200 text-slate-900 shadow-lg shadow-black/20"
                    : "text-stone-400 hover:text-stone-200"
                )}
              >
                {d} Seconds
              </button>
            ))}
          </div>
          <p className="text-[10px] text-stone-500 italic text-center">Short practice bursts keep the pacing sharp without turning the screen into a game.</p>
        </div>

        {/* Tier cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Choose your pace</p>
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
                <p className="text-xs text-stone-400 leading-relaxed">{tier.hint}</p>
                <p className="text-[10px] text-stone-500 font-medium">
                  {tier.texts.length} academic drill texts · {tier.chunkSize}-word {tier.chunkSize === 1 ? 'chunk' : 'chunks'}
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
        <p className="text-stone-100 font-semibold text-base">{tier.hint}</p>
        <p className="text-stone-500 text-xs">{drill.wordCount} words · {tier.chunkSize}-word chunks</p>
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
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">Drill Complete!</h2>
          <p className={cn("text-sm font-semibold", tierAccent[tier.id])}>
            {tier.label} · {tier.targetWpm} WPM
          </p>
        </div>

        {/* Active Recall Badge */}
        <div className="flex justify-center pt-1">
          {recallCorrect ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Recall check: Clear
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Recall check: Needs review
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 bg-stone-900/70 border border-stone-800 rounded-2xl p-4">
          <div>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Beats</p>
            <p className="text-xl font-black text-white mt-1 tabular-nums">{beatCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Actual WPM</p>
            <p className={cn("text-xl font-black mt-1 tabular-nums", tierAccent[tier.id])}>{actualWpm}</p>
          </div>
          <div>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">vs Target</p>
            <p className={cn("text-xl font-black mt-1 tabular-nums", wpmDiff >= -10 ? "text-emerald-300" : "text-amber-300")}>
              {wpmDiff >= 0 ? "+" : ""}{wpmDiff}
            </p>
          </div>
        </div>

        {/* Feedback message */}
        <p className="text-sm text-stone-400 leading-relaxed">
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

  const chunks = useMemo(() => {
    if (tier.id === "stage3") {
      const sentences = currentDrill.text.split(/(?<=[.!?])\s+/).filter(Boolean);
      return sentences.map((s) => ({ words: s.trim().split(/\s+/).filter(Boolean) }));
    }
    return chunkText(currentDrill.text, tier.chunkSize);
  }, [currentDrill, tier.id, tier.chunkSize]);
  const beatIntervalsMs = useMemo(() => buildLaapIntervals(chunks, tier.targetWpm, tier.chunkSize), [chunks, tier.targetWpm, tier.chunkSize]);
  const fallbackIntervalMs = useMemo(() => wpmToIntervalMs(tier.targetWpm, tier.chunkSize || 10), [tier.targetWpm, tier.chunkSize]);
  const [currentChunk, setCurrentChunk] = useState(0);

  const stateRef = useRef({
    isPaused,
    currentChunkIndex,
    chunksLength: chunks.length,
    beatIntervalsMs,
    currentDrill,
  });

  useEffect(() => {
    stateRef.current = {
      isPaused,
      currentChunkIndex,
      chunksLength: chunks.length,
      beatIntervalsMs,
      currentDrill,
    };
  });

  // Metronome pacing ticking loop
  useEffect(() => {
    if (isPaused) return;

    let timerId: ReturnType<typeof setTimeout>;

    const runTick = () => {
      const { chunksLength, currentChunkIndex: currIdx, beatIntervalsMs: currentIntervals } = stateRef.current;
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

      const nextDelay = currentIntervals[currIdx] ?? fallbackIntervalMs;
      timerId = setTimeout(runTick, Math.max(80, nextDelay));
    };

    timerId = setTimeout(runTick, beatIntervalsMs[0] ?? fallbackIntervalMs);
    return () => clearTimeout(timerId);
  }, [isPaused, beatIntervalsMs, fallbackIntervalMs]);

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
              "bg-rose-500": tier.id === "stage1",
              "bg-indigo-500": tier.id === "stage2",
              "bg-cyan-500": tier.id === "stage3",
            })}
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        <div className="flex items-center justify-between px-3 sm:px-6 h-11 gap-2">
          <button
            onClick={onBack}
            className="group flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-800 bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 hover:border-stone-700 transition-all duration-200 shadow-md text-xs font-bold"
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
        {tier.id === "stage3" ? (
          <div className="w-full max-w-xl bg-white text-stone-900 border border-slate-200 shadow-xl rounded-2xl p-8 text-left space-y-6 transition-all duration-300 select-text">
            <div className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 border-b pb-2 border-slate-100 flex justify-between items-center">
              <span>CAT/GMAT Exam Simulation</span>
              <span>Speed: 300 WPM</span>
            </div>
            <p className="font-serif text-lg leading-relaxed text-slate-800 antialiased font-normal select-text">
              {currentDrill.text}
            </p>
            <div className="text-center pt-4">
              <p className="text-[11px] text-slate-400 italic">No visual aids, no highlights, no metronome. Click Back or wait for the timer to finish.</p>
            </div>
          </div>
        ) : (
          <div className={cn("w-full max-w-xl text-center relative py-16 px-6 sm:px-12 min-h-[220px] flex flex-col justify-center items-center rounded-3xl border transition-all duration-300 shadow-xl", {
            "border-stone-850 bg-stone-950/60 backdrop-blur-sm": tier.id === "stage1",
            "border-stone-300 bg-white shadow-xl": tier.id === "stage2", // Stark Black/White for Stage 2
          })}>
            {/* Corner Brackets for stage 1 */}
            {tier.id === "stage1" && (
              <>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg border-rose-500/40" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg border-rose-500/40" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-lg border-rose-500/40" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-lg border-rose-500/40" />
              </>
            )}

            {/* Rhythmic Horizontal Tracking Guide */}
            {tier.id === "stage1" && (
              <div className="absolute inset-x-12 bottom-4 h-[2px] overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-full bg-rose-500 text-rose-500 opacity-20 shadow-[0_0_8px_currentColor]" />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={currentChunk}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: Math.min((beatIntervalsMs[currentChunk] ?? fallbackIntervalMs) * 0.25 / 1000, 0.1), ease: "easeOut" }}
                className={cn("font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-relaxed tracking-wide select-none px-4", {
                  "text-stone-100": tier.id === "stage1",
                  "text-stone-900": tier.id === "stage2", // Stark text color for Stage 2
                })}
              >
                {renderScientificChunk(chunks[currentChunk]?.words ?? [], tier.id)}
              </motion.div>
            </AnimatePresence>

            {/* Beat position indicator */}
            <div className="mt-8 flex items-center justify-center gap-1.5">
              {chunks.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-100",
                    i < currentChunk
                      ? "w-3 bg-stone-600"
                      : i === currentChunk
                      ? cn("w-6", {
                          "bg-rose-500": tier.id === "stage1",
                          "bg-stone-850": tier.id === "stage2",
                        })
                      : "w-3 bg-stone-800"
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Paused overlay */}
      {isPaused && (
        <div
          className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 cursor-pointer"
          onClick={handlePauseResume}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl text-stone-300">Pause</div>
            <p className="text-stone-100 font-semibold">Paused</p>
            <p className="text-sm text-stone-400">Click anywhere to resume</p>
          </div>
        </div>
      )}

      {/* Visual Metronome */}
      <MetronomeFlash tier={tier} beatCount={currentChunkIndex} intervalMs={beatIntervalsMs[currentChunkIndex] ?? fallbackIntervalMs} />
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
                stroke={
                  tier.id === "stage1" ? "#f43f5e" : // rose-500
                  tier.id === "stage2" ? "#6366f1" : // indigo-500
                  tier.id === "stage3" ? "#06b6d4" : // cyan-500
                  tier.id === "stage4" ? "#f59e0b" : // amber-500
                  "#10b981"                          // emerald-500 (stage5)
                }
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
