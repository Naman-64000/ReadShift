/**
 * client/src/screens/CalibrationScreen.tsx
 */

import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/apiClient";
import { calculateActualWpm } from "@/lib/utils";
import { CALIBRATION_WORD_COUNT } from "@/lib/constants";
import Button from "@/components/shared/Button";

const CALIBRATION_PASSAGE =
  "The relationship between speed and comprehension in reading is more nuanced than most people assume. Research consistently shows that skilled readers do not read every word individually. Instead, they process language in meaningful clusters, allowing their brains to predict and fill in information based on context and prior knowledge. This chunking behaviour is automatic in fluent readers and is one reason why speed and understanding do not always trade off against each other. Training this skill deliberately, rather than simply trying to read faster, produces more durable improvements. The key insight is that reading speed is not primarily limited by eye movement but by the rate at which the brain can process and retain meaning. Expanding that processing capacity, rather than rushing the eyes, is what separates effective speed readers from those who merely skim.";

export default function CalibrationScreen() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"intro" | "reading" | "done">("intro");
  const [wpm, setWpm] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  const handleStartReading = () => {
    startTimeRef.current = Date.now();
    setPhase("reading");
  };

  const handleDone = useCallback(async () => {
    if (!startTimeRef.current) return;
    const elapsedMs = Date.now() - startTimeRef.current;
    const calculatedWpm = calculateActualWpm(CALIBRATION_WORD_COUNT, elapsedMs);
    setWpm(calculatedWpm);
    setPhase("done");

    setIsSubmitting(true);
    try {
      await apiClient.post("/calibrations", {
        wpm: calculatedWpm,
        recorded_at: new Date().toISOString(),
      });
    } catch {
      // Non-fatal — user still sees their WPM
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-14 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {phase === "intro" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-5xl">📖</div>
            <h1 className="text-3xl font-black text-white">Calibrate Your Reading Speed</h1>
            <p className="text-slate-400 max-w-md mx-auto">
              Read the passage below at your <strong className="text-white">natural pace</strong> —
              not faster, not slower. When you finish, tap Done. This sets your baseline WPM.
            </p>
            <p className="text-xs text-slate-600">100 words · No timer pressure</p>
            <Button size="lg" onClick={handleStartReading}>Start Reading</Button>
          </motion.div>
        )}

        {phase === "reading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <p className="text-slate-200 text-lg leading-[1.9] font-normal">
              {CALIBRATION_PASSAGE}
            </p>
            <Button size="lg" className="w-full" onClick={handleDone}>
              Done Reading →
            </Button>
          </motion.div>
        )}

        {phase === "done" && wpm !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="text-5xl">🎯</div>
            <h2 className="text-2xl font-black text-white">Your Baseline</h2>
            <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-8">
              <div className="text-7xl font-black text-white tabular-nums">{wpm}</div>
              <div className="text-indigo-400 font-semibold mt-2">Words Per Minute</div>
            </div>
            {isSubmitting && <p className="text-xs text-slate-500">Saving your baseline…</p>}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1" onClick={() => navigate("/session/config")}>
                Start Training →
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                onClick={() => { setPhase("intro"); setWpm(null); }}
              >
                Re-calibrate
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
