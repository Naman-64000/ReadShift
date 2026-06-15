/**
 * client/src/screens/CalibrationScreen.tsx
 *
 * Calibration flow:
 *   1. "intro"  — user reads instructions, passage not yet visible.
 *                 A random full-length passage is fetched from the DB in the background.
 *   2. "ready"  — passage loaded; user sees a "Start Reading" button. Timer NOT shown.
 *                 Clicking the button transitions to "reading" and starts the hidden timer.
 *   3. "reading" — Full passage is displayed. No timer visible. User reads at natural pace.
 *                  Clicks "Done Reading" when finished.
 *   4. "done"   — WPM result shown and saved to DB.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardStore, useSessionStore, useUserStore } from "@/store";
import { apiClient } from "@/lib/apiClient";
import { calculateActualWpm, cn, getPassageFontSize } from "@/lib/utils";
import Button from "@/components/shared/Button";
import { DOMAINS } from "@/lib/constants";

// Fallback static passages in case the DB fetch fails
const FALLBACK_PASSAGES = [
  {
    id: "fallback-1",
    body: "The rise of distributed ledger technology has forced financial institutions to re-evaluate their transactional infrastructure. Traditional banking relies heavily on centralized clearing houses to validate transfers and prevent double-spending. This architecture, while historically secure, introduces significant settlement delays and processing fees. In contrast, blockchain networks employ decentralized consensus protocols, allowing participants to verify transactions collectively. This shift not only accelerates settlement times but also lowers transactional costs by eliminating intermediaries. However, scaling these networks remains a challenge, as consensus mechanisms require substantial computational overhead and energy expenditure to secure the ledger.",
    word_count: 97,
    domain: "business",
    topic_key: "Distributed Ledger Technology",
  },
  {
    id: "fallback-2",
    body: "Neuroplasticity refers to the brain's ability to reorganize itself by forming new neural pathways throughout life. This dynamic process allows neurons to adjust their activities in response to learning, experience, or environmental changes. For decades, scientific consensus held that the adult brain was relatively fixed and incapable of significant structural alteration. However, modern neuroimaging has demonstrated that targeted training can induce measurable physical changes in brain regions associated with memory and executive function. This means that cognitive capacities are not entirely static or determined by genetics, but can be deliberately enhanced through sustained and focused practice.",
    word_count: 97,
    domain: "science",
    topic_key: "Neuroplasticity",
  },
];

interface CalibPassage {
  id: string;
  body: string;
  word_count: number;
  domain: string;
  title?: string | null;
  topic_key?: string | null;
}

const DOMAIN_LABELS: Record<string, string> = {
  business: "Business & Economics",
  science: "Science & Technology",
  history: "History & Culture",
  abstract: "Philosophy & Abstract",
  social: "Society & Psychology",
};

export default function CalibrationScreen() {
  const navigate = useNavigate();
  const preferences = useUserStore((s) => s.preferences);
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const [phase, setPhase] = useState<"intro" | "ready" | "reading" | "done">("intro");
  const [passage, setPassage] = useState<CalibPassage | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [wpm, setWpm] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tooFastError, setTooFastError] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  // Fetch a random passage from the DB on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get<{ data: CalibPassage }>("/calibrations/passage");
        setPassage(res.data.data);
      } catch {
        // Fallback: pick a random static passage
        const picked = FALLBACK_PASSAGES[Math.floor(Math.random() * FALLBACK_PASSAGES.length)];
        setPassage(picked);

      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const wordCount = passage?.word_count ?? passage?.body.split(/\s+/).filter(Boolean).length ?? 100;
  const colWidthClass: Record<"narrow" | "medium" | "wide", string> = {
    narrow: "max-w-[38rem]",
    medium: "max-w-[52rem]",
    wide: "max-w-[65rem]",
  };

  useEffect(() => {
    if (!preferences) void fetchProfile();
  }, [preferences, fetchProfile]);

  // User clicked "Start Reading" — reveal passage and silently start timer
  const handleStartReading = () => {
    startTimeRef.current = Date.now();
    setTooFastError(false);
    setPhase("reading");
  };

  const handleDone = useCallback(async () => {
    if (!startTimeRef.current) return;
    const elapsedMs = Date.now() - startTimeRef.current;

    // Minimum threshold: reject if under ~545 WPM (clearly impossible natural reading)
    const thresholdMs = Math.round((wordCount / 545) * 60_000);
    if (elapsedMs < thresholdMs) {
      setTooFastError(true);
      return;
    }

    const calculatedWpm = Math.max(100, Math.min(300, calculateActualWpm(wordCount, elapsedMs)));
    setTooFastError(false);
    setWpm(calculatedWpm);
    setPhase("done");

    setIsSubmitting(true);
    try {
      await apiClient.post("/calibrations", {
        wpm: calculatedWpm,
        recorded_at: new Date().toISOString(),
      });
      useDashboardStore.getState().invalidate();
      useSessionStore.getState().setLastSelectedWpm(null);
    } catch {
      // Non-fatal — user still sees their WPM
    } finally {
      setIsSubmitting(false);
    }
  }, [wordCount]);

  // Fetch a fresh passage for re-calibration
  const handleRecalibrate = async () => {
    setPhase("intro");
    setWpm(null);
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ data: CalibPassage }>("/calibrations/passage");
      setPassage(res.data.data);

    } catch {
      const picked = FALLBACK_PASSAGES[Math.floor(Math.random() * FALLBACK_PASSAGES.length)];
      setPassage(picked);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 flex items-center justify-center px-4 py-12 relative">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {phase !== "reading" && (
          <div className="self-start mb-6">
            <button
              onClick={() => navigate("/")}
              className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-slate-900/80 backdrop-blur text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-xl cursor-pointer"
            >
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">Dashboard</span>
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">

          {/* ── INTRO PHASE ── */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-7"
            >
              <div className="text-5xl">📖</div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-white">Calibrate Your Reading Speed</h1>
                <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                  You'll read a passage at your <strong className="text-white">natural pace</strong> —
                  not faster, not slower. Read as you normally would. When you finish, click Done.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  No timer will be shown during reading. This sets your baseline WPM.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 p-5 text-left space-y-2 max-w-sm mx-auto">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Tips for accurate results</p>
                <ul className="text-sm text-slate-300 space-y-1.5">
                  <li>✓ Read every word — don't skim</li>
                  <li>✓ Use your natural reading speed</li>
                  <li>✓ Read in a quiet environment</li>
                  <li>✗ Don't rush or slow down deliberately</li>
                </ul>
              </div>

              <Button
                size="lg"
                onClick={() => setPhase("ready")}
                isLoading={isLoading}
                disabled={isLoading}
                className="min-w-48"
              >
                {isLoading ? "Preparing passage…" : "I'm Ready →"}
              </Button>
            </motion.div>
          )}

          {/* ── READY PHASE — passage loaded, waiting for user to click Start ── */}
          {phase === "ready" && passage && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6"
            >
              <div className="text-4xl">🎯</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Your Passage is Ready</h2>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Click <strong className="text-white">Start Reading</strong> when you are ready.
                  The passage will appear and the timer will start silently — click Done when you finish.
                </p>
              </div>

              {/* Passage meta card */}
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 py-4 px-6 inline-flex items-center gap-3 mx-auto">
                <span className="text-2xl">
                  {DOMAINS.find((domain) => domain.value === passage.domain)?.emoji ?? "📖"}
                </span>
                <div className="text-left">
                  <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                    {DOMAIN_LABELS[passage.domain] ?? passage.domain}
                  </p>
                  <p className="text-sm text-slate-300 font-medium mt-0.5">
                    {passage.title ?? passage.topic_key?.replace(/-/g, " ") ?? "Academic Reading Passage"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">~{wordCount} words</p>
                </div>
              </div>

              <Button size="lg" onClick={handleStartReading} className="min-w-48 shadow-lg shadow-indigo-500/20">
                Start Reading →
              </Button>
            </motion.div>
          )}

          {/* ── READING PHASE ── */}
          {phase === "reading" && passage && (
            <motion.div
              key="reading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Subtle domain label — no timer */}
              <div className="flex items-center justify-between pb-2 border-b border-white/8">
                <span className="text-xs text-slate-500 font-medium">
                  Read at your natural pace
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {DOMAIN_LABELS[passage.domain] ?? passage.domain}
                </span>
              </div>

              <div className={cn("rounded-3xl border border-white/10 bg-slate-900/40 p-8 sm:p-10 shadow-2xl backdrop-blur-sm mx-auto w-full", colWidthClass[preferences?.col_width ?? "medium"])}>
                <div 
                  className={cn(
                    "space-y-6 text-slate-200 leading-[2.0] font-normal tracking-[0.01em] select-text text-left",
                    preferences?.font_size_px === 12 ? "font-sans" : "font-serif"
                  )}
                  style={{ 
                    fontSize: `${getPassageFontSize(preferences?.font_size_px)}px`,
                    fontFamily: preferences?.font_size_px === 12 ? "Arial, Calibri, sans-serif" : undefined
                  }}
                >
                  {passage.body.split(/\n\s*\n/).map((p, idx) => (
                    <p key={idx}>{p.trim()}</p>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {tooFastError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-amber-400 text-center font-medium bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3"
                  >
                    That was a bit too fast — please read the full passage at your natural pace.
                  </motion.p>
                )}
                <Button size="lg" className="w-full" onClick={handleDone}>
                  Done Reading →
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── DONE PHASE ── */}
          {phase === "done" && wpm !== null && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6"
            >
              <div className="text-5xl">🎯</div>
              <h2 className="text-2xl font-black text-white">Your Reading Baseline</h2>

              <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-500/15 to-indigo-500/5 p-8">
                <div className="text-7xl font-black text-white tabular-nums tracking-tight">{wpm}</div>
                <div className="text-indigo-400 font-semibold mt-2 text-lg">Words Per Minute</div>
                <div className="mt-3 text-xs text-slate-500">
                  {wpm < 350
                    ? "Comfortable Pace — solid everyday reading baseline"
                    : wpm < 450
                    ? "Advanced Pace — competitive reading baseline"
                    : "Elite Pace — high-performance reading baseline"}
                </div>
              </div>

              {isSubmitting && (
                <p className="text-xs text-slate-500">Saving your baseline…</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="flex-1" onClick={() => navigate("/session/config")}>
                  Start Training →
                </Button>
                <Button size="lg" variant="secondary" className="flex-1" onClick={handleRecalibrate}>
                  Re-calibrate
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
