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
import { apiClient } from "@/lib/apiClient";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "select" | "ready" | "running" | "comprehension" | "done";

export type DrillTierId = DrillTier["id"];


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

/**
 * Renders RSVP word chunks following RSVP research guidelines:
 *
 *  L1–L2 (stage1, stage2): Completely plain — no highlighting, no colors.
 *           Brain learns actual reading; maximum transfer to CAT.
 *
 *  L3–L5 (stage3, stage4, stage5): Subtle single-character ORP fixation marker.
 *           Only ONE character at the center-left (~30%) of the first word
 *           gets a quiet dark-red color — pure fixation anchor, no bold,
 *           no half-word bionic reading, no color-changing per word.
 *
 *  L6 (stage6): Full-page CAT simulation — not rendered here.
 */
function renderScientificChunk(words: string[], stageId: string) {
  if (words.length === 0) return null;

  // ── L1 & L2: completely plain ──────────────────────────────────────────────
  if (stageId === "stage1" || stageId === "stage2") {
    return (
      <span className="tracking-normal">
        {words.join(" ")}
      </span>
    );
  }

  // ── L3, L4, L5: single-character ORP marker on first word ─────────────────
  // Research: one fixation point near center-left reduces saccades without
  // adding visual processing load from colors or bold spans.
  if (stageId === "stage3" || stageId === "stage4" || stageId === "stage5") {
    const renderWordWithOrp = (word: string, addOrp: boolean) => {
      if (!addOrp || word.length <= 2) {
        return <span>{word}</span>;
      }
      // ORP position: ~30% into the word, minimum index 1
      const orpIdx = Math.max(1, Math.round(word.length * 0.3));
      const before = word.substring(0, orpIdx);
      const marker = word[orpIdx];
      const after = word.substring(orpIdx + 1);
      return (
        <span>
          {before}
          <span className="drill-orp-single">{marker}</span>
          {after}
        </span>
      );
    };

    return (
      <span className="tracking-normal">
        {words.map((w, idx) => (
          <span key={idx}>
            {idx > 0 && " "}
            {renderWordWithOrp(w, idx === 0)}
          </span>
        ))}
      </span>
    );
  }

  // Stage 6 / default: plain
  return <span>{words.join(" ")}</span>;
}

// ── Tier card colors ─────────────────────────────────────────────────────────

const tierBg: Record<DrillTier["id"], string> = {
  stage1: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700",
  stage2: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700",
  stage3: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700",
  stage4: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700",
  stage5: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700",
  stage6: "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700",
};
const tierAccent: Record<DrillTier["id"], string> = {
  stage1: "text-rose-400",
  stage2: "text-cyan-400",
  stage3: "text-indigo-400",
  stage4: "text-amber-400",
  stage5: "text-violet-400",
  stage6: "text-emerald-400",
};
const tierBadge: Record<DrillTier["id"], string> = {
  stage1: "bg-rose-950/30 text-rose-400 border-rose-900/30",
  stage2: "bg-cyan-950/30 text-cyan-400 border-cyan-900/30",
  stage3: "bg-indigo-950/30 text-indigo-400 border-indigo-900/30",
  stage4: "bg-amber-950/30 text-amber-400 border-amber-900/30",
  stage5: "bg-violet-950/30 text-violet-400 border-violet-900/30",
  stage6: "bg-emerald-950/30 text-emerald-400 border-emerald-900/30",
};
const metronomeColor: Record<DrillTier["id"], string> = {
  stage1: "border-rose-900 shadow-sm",
  stage2: "border-cyan-900 shadow-sm",
  stage3: "border-indigo-900 shadow-sm",
  stage4: "border-amber-900 shadow-sm",
  stage5: "border-violet-900 shadow-sm",
  stage6: "border-transparent",
};




// ── Tier Selector ─────────────────────────────────────────────────────────────

interface TierSelectorProps {
  onSelect: (tier: DrillTier) => void;
}

function TierSelector({ onSelect }: TierSelectorProps) {
  const [showResearch, setShowResearch] = useState(false);
  return (
    <div className="min-h-screen pt-20 pb-16 px-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl space-y-8"
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
              { icon: "1", label: "Read by beat", desc: "Each chunk flashes at your target WPM — LAAP timing adapts slightly for complex words" },
              { icon: "2", label: "6 progressive levels", desc: "L1–L2 build rhythm at 180–220 WPM; L5 overloads at 400 WPM to make your target exam pace feel slow and highly manageable" },
              { icon: "3", label: "Stay in rhythm", desc: "Total pace stays locked at the target WPM as timing shifts within the chunk sequence" },
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

        {/* Research Notes Card */}
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-300" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-[rgb(var(--text))] flex items-center gap-1.5">
              <span>🔬</span> RSVP Speed Reading Research
            </h3>
            <p className="text-[11px] text-stone-400 font-medium max-w-sm sm:max-w-md">
              Discover the peer-reviewed evidence regarding Rapid Serial Visual Presentation (RSVP), comprehension boundaries, and speed pacing transfer to normal reading.
            </p>
          </div>
          <button
            onClick={() => setShowResearch(true)}
            className="px-4 py-2 shrink-0 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:underline dark:hover:bg-indigo-500 dark:hover:text-white transition-all cursor-pointer shadow-lg shadow-indigo-500/5"
          >
            Open Research Notes
          </button>
        </section>

        {/* Tier cards — all 6 in one uniform grid */}
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
                  5+ unique drill texts
                  {tier.chunkSize > 0 ? ` · ${tier.chunkSize}-word chunks` : " · full passage"}
                  {` · ${tier.durationSec}s`}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* RSVP Speed Reading Research Modal Overlay */}
      <AnimatePresence>
        {showResearch && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#fafaf9] dark:bg-[#0b101c]/95 border border-stone-200 dark:border-indigo-500/20 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative text-left"
            >
              {/* Top Accent Line */}
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 dark:border-white/5 bg-stone-100 dark:bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔬</span>
                  <div>
                    <h2 className="text-base font-black text-stone-900 dark:text-white">RSVP Speed Reading Research</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">Scientific Pacing & Comprehension Notes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResearch(false)}
                  className="h-8 w-8 rounded-xl border border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 bg-stone-200/50 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-6 md:p-8 space-y-6 flex-1 scrollbar-thin scrollbar-thumb-indigo-500/25">
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/5 space-y-2">
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "Metronome/RSVP drills are designed to reduce unnecessary pauses and encourage phrase-level recognition; they are a supplement to regular RC practice, not a replacement for it."
                  </p>
                  <a
                    href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7846947/"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-block text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
                  >
                    PMC · Training to improve temporal letter processing
                  </a>
                </div>

                <div className="space-y-6">
                  {([
                    { n: "1", title: "Trains pacing — not intelligence", body: "The primary benefit is reduced hesitation, fewer regressions, and consistent rhythm. It does not directly teach vocabulary, inference, or RC strategy.", source: { label: "PMC · Temporal letter processing", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7846947/" } },
                    { n: "2", title: "Don't judge progress by WPM alone", body: "For CAT, reading faster only helps if you still understand the passage well—doubling your speed is useless if it causes you to miss the ideas needed to answer the questions.", source: { label: "ResearchGate · RSVP comprehension degradation", href: "https://www.researchgate.net/publication/328925418_Rapid_serial_visual_presentation_Degradation_of_inferential_reading_comprehension_as_a_function_of_speed" } },
                    { n: "3", title: "The goal is transfer to normal reading", body: "CAT passages are normal text. Train here, then measure whether normal reading speed and RC accuracy improve. If they don't after weeks, the drill is not transferring.", source: { label: "PubMed · Modern speed-reading apps", href: "https://pubmed.ncbi.nlm.nih.gov/29461715/" } },
                    { n: "4", title: "RSVP removes natural reading advantages", body: "Normal readers use parafoveal preview and strategic regressions — RSVP eliminates both. Reading scientists are therefore skeptical of claims that RSVP is universally superior.", source: { label: "PubMed · Modern speed-reading apps", href: "https://pubmed.ncbi.nlm.nih.gov/29461715/" } },
                    { n: "5", title: "Feeling difficult is normal", body: "Understanding less at 300 WPM than 180 WPM is expected. Like a runner training above race pace, temporary overload is the mechanism — not a sign the drill isn't working.", source: { label: "WIRED · Speed reading won't help", href: "https://www.wired.com/2017/01/make-resolution-read-speed-reading-wont-help/" } },
                    { n: "6", title: "Don't chase extreme speeds", body: "200–300 WPM can maintain comprehension. 400–450+ WPM tends to produce significant comprehension losses. For CAT, pursuing 400-450+ WPM has no practical evidence base.", source: { label: "ResearchGate · RSVP comprehension degradation", href: "https://www.researchgate.net/publication/328925418_Rapid_serial_visual_presentation_Degradation_of_inferential_reading_comprehension_as_a_function_of_speed" } },
                    { n: "7", title: "Most improvement comes from reading more", body: "Eye-tracking studies show skilled readers know more vocabulary, recognise phrases faster, and need fewer fixations. Long-term gains come from difficult material, not visual tricks.", source: { label: "PMC · Eye movements and fixation in reading", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7157570/" } },
                    { n: "8", title: "Bionic Reading is not scientifically proven", body: "Bolding the first half of words shows no meaningful speed or comprehension improvement in controlled studies — and sometimes produces longer reading times.", source: { label: "ScienceDirect · No, Bionic Reading does not work", href: "https://www.sciencedirect.com/science/article/pii/S0001691824001811" } },
                    { n: "9", title: "Use the drill to learn phrase recognition", body: "Skilled readers see 'economic growth' as one unit, not two words. Chunk-based RSVP is one of the most plausible paths from word-level to phrase-level recognition.", source: { label: "PMC · Temporal letter processing", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7846947/" } },
                    { n: "10", title: "Measure improvement outside the drill", body: "Track normal reading WPM, RC accuracy, and time-per-CAT-RC weekly. RSVP WPM is secondary. If real-world scores don't improve, higher RSVP speed is largely meaningless.", source: { label: "PubMed · Modern speed-reading apps", href: "https://pubmed.ncbi.nlm.nih.gov/29461715/" } },
                  ] as const).map(({ n, title, body, source }) => (
                    <div key={n} className="p-5 rounded-2xl border border-stone-200 dark:border-white/5 bg-white dark:bg-white/2 hover:border-indigo-500/15 transition-all flex gap-3">
                      <span className="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-indigo-500/10 text-xs font-black text-indigo-500 dark:text-indigo-400 flex items-center justify-center">{n}</span>
                      <div className="space-y-2 min-w-0">
                        <h4 className="text-sm font-black text-stone-900 dark:text-white leading-snug">{title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{body}</p>
                        <a href={source.href} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                          onClick={(e) => e.stopPropagation()}>
                          <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                          {source.label}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end items-center px-6 py-4 border-t border-stone-200 dark:border-white/5 bg-stone-100 dark:bg-slate-950/40 gap-3">
                <Button
                  onClick={() => setShowResearch(false)}
                  className="px-5 text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2 cursor-pointer shadow-lg shadow-indigo-500/10"
                >
                  Understood, Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Ready Screen (countdown + tip) ──────────────────────────────────────────

interface ReadyScreenProps {
  tier: DrillTier;
  onStart: () => void;
  onBack: () => void;
}

function ReadyScreen({ tier, onStart, onBack }: ReadyScreenProps) {
  const [countdown, setCountdown] = useState(3);
  const targetWords = Math.round((tier.durationSec * tier.targetWpm) / 60);

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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center gap-8 drill-ready-screen">
      {/* Countdown ring */}
      <motion.div
        key={countdown}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "w-28 h-28 rounded-full border-4 flex items-center justify-center drill-metronome-ring",
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
        <p className="text-stone-500 text-xs">{targetWords} words · {tier.chunkSize > 0 ? `${tier.chunkSize}-word chunks` : 'full passage'}</p>
      </div>

      <button
        onClick={onBack}
        className="text-xs text-slate-500 hover:text-indigo-600 dark:text-stone-400 dark:hover:text-stone-200 transition-colors underline underline-offset-2"
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 drill-result-screen">
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
        <div className="grid grid-cols-2 gap-3 bg-stone-900/70 border border-stone-800 rounded-2xl p-4">
          <div>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Beats</p>
            <p className="text-xl font-black text-white mt-1 tabular-nums">{beatCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Actual WPM</p>
            <p className={cn("text-xl font-black mt-1 tabular-nums", tierAccent[tier.id])}>{actualWpm}</p>
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
  onDone: (elapsedMs: number, beatCount: number, totalWords: number, lastDrill: DrillText) => void;
  onBack: () => void;
}

function DrillRunner({ tier, drill, onDone, onBack }: DrillRunnerProps) {
  const duration = tier.durationSec;
  const [currentDrill, setCurrentDrill] = useState<DrillText>(drill);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [isPaused, setIsPaused] = useState(false);

  const beatCountRef = useRef(0);
  const totalWordsReadRef = useRef(0);
  const drillTextsPool = useRef([drill]);
  const currentDrillIndexRef = useRef(0);

  const chunks = useMemo(() => {
    if (tier.id === "stage6") {
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
    <div className="min-h-screen bg-slate-950 flex flex-col relative drill-runner-screen">
      {/* Top HUD */}
      <div className="fixed top-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur border-b border-white/8">
        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/5 overflow-hidden">
          <motion.div
              className={cn("h-full", {
              "bg-rose-500": tier.id === "stage1",
              "bg-cyan-500": tier.id === "stage2",
              "bg-indigo-500": tier.id === "stage3",
              "bg-amber-500": tier.id === "stage4",
              "bg-violet-500": tier.id === "stage5",
              "bg-emerald-500": tier.id === "stage6",
            })}
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        <div className="flex items-center justify-between px-3 sm:px-6 h-11 gap-2">
          <button
            onClick={onBack}
            className="group flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-md text-xs font-bold drill-back-button nav-action-button"
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
            <span className={cn("text-[10px] font-bold tracking-widest px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 tabular-nums", tierBadge[tier.id])}>
              <span>⌛ {timeLeft}s remaining</span>
              <span>·</span>
              <span className="uppercase">{tier.targetWpm} WPM</span>
            </span>
          </div>


          <button
            onClick={handlePauseResume}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-bold transition-all duration-300 shadow-md nav-action-button",
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
        {tier.id === "stage6" ? (
          <div className="w-full max-w-xl bg-white text-stone-900 border border-slate-200 shadow-xl rounded-2xl p-8 text-left space-y-6 transition-all duration-300 select-text">
            <div className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 border-b pb-2 border-slate-100 flex justify-between items-center">
              <span>CAT Exam Simulation</span>
              <span>Speed: {tier.targetWpm} WPM</span>
            </div>
            <p className="font-serif text-lg leading-relaxed text-slate-800 antialiased font-normal select-text">
              {currentDrill.text}
            </p>
            <div className="text-center pt-4">
              <p className="text-[11px] text-slate-400 italic">No visual aids, no highlights, no metronome. Click Back or wait for the timer to finish.</p>
            </div>
          </div>
        ) : (
          <div
            className="w-full max-w-xl text-center relative flex flex-col justify-center items-center rounded-2xl border border-stone-200 bg-[#fafaf9] shadow-lg"
            style={{ minHeight: "220px", padding: "4rem 3rem" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentChunk}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: Math.min((beatIntervalsMs[currentChunk] ?? fallbackIntervalMs) * 0.25 / 1000, 0.09), ease: "easeOut" }}
                className={cn(
                  "select-none font-sans text-stone-900 leading-snug tracking-normal",
                  tier.id === "stage1" ? "text-3xl sm:text-4xl font-normal" :
                  tier.id === "stage2" ? "text-2xl sm:text-3xl font-normal" :
                  tier.id === "stage3" ? "text-2xl sm:text-3xl font-normal" :
                  tier.id === "stage4" ? "text-xl sm:text-2xl font-normal" :
                  "text-lg sm:text-xl font-normal"
                )}
              >
                {renderScientificChunk(chunks[currentChunk]?.words ?? [], tier.id)}
              </motion.div>
            </AnimatePresence>
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center drill-comprehension-screen">
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
                  tier.id === "stage2" ? "#06b6d4" : // cyan-500
                  tier.id === "stage3" ? "#6366f1" : // indigo-500
                  tier.id === "stage4" ? "#f59e0b" : // amber-500
                  tier.id === "stage5" ? "#8b5cf6" : // violet-500
                  "#10b981"                          // emerald-500 (stage6)
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
                  "w-full py-4 px-6 rounded-2xl border text-sm font-bold transition-all text-center drill-opt-button",
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
  const [activeDrill, setActiveDrill] = useState<DrillText | null>(null);
  const [loading, setLoading] = useState(false);
  // duration now comes from tier.durationSec — no separate state needed
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

  const loadDrill = useCallback(async (tier: DrillTier) => {
    setLoading(true);
    try {
      const level = Number(tier.id.replace("stage", ""));
      const res = await apiClient.post("/drills/start", { level });
      const drillData = res.data.data.drill;
      const drillText: DrillText = {
        id: drillData.id,
        text: drillData.body,
        wordCount: drillData.word_count,
        question: {
          stem: drillData.question_stem,
          options: drillData.options,
          correctIndex: drillData.correct_index,
        },
      };
      setActiveDrill(drillText);
      setPhase("ready");
    } catch (err) {
      console.error("Failed to load drill passage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTierSelect = useCallback((tier: DrillTier) => {
    setSelectedTier(tier);
    setRecallCorrect(null);
    void loadDrill(tier);
  }, [loadDrill]);

  const handleStart = useCallback(async () => {
    setPhase("running");
    if (activeDrill) {
      try {
        await apiClient.post("/drills/complete", { drill_passage_id: activeDrill.id });
      } catch (err) {
        console.error("Failed to mark drill as completed:", err);
      }
    }
  }, [activeDrill]);

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
    setResultData(null);
    setRecallCorrect(null);
    void loadDrill(selectedTier);
  }, [selectedTier, loadDrill]);

  const handleReplay = useCallback(() => {
    setResultData(null);
    setRecallCorrect(null);
    setPhase("ready");
  }, []);

  const handleBack = useCallback(() => {
    setSelectedTier(null);
    setActiveDrill(null);
    setResultData(null);
    setRecallCorrect(null);
    setPhase("select");
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === "select" || !selectedTier) {
    return <TierSelector onSelect={handleTierSelect} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="space-y-6 max-w-sm">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-white">Preparing Drill</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fetching the drill paragraph. If you have already viewed the 5 pre-seeded drills for this level, a new unique passage is being generated via Gemini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeDrill) return null;

  const currentDrill = activeDrill;

  if (phase === "ready") {
    return (
      <ReadyScreen
        tier={selectedTier}
        onStart={handleStart}
        onBack={handleBack}
      />
    );
  }

  if (phase === "running") {
    return (
      <DrillRunner
        key={`${selectedTier.id}-${currentDrill.id}`}
        tier={selectedTier}
        drill={currentDrill}
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
