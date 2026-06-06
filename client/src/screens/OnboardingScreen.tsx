/**
 * client/src/screens/OnboardingScreen.tsx
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/store";
import Button from "@/components/shared/Button";
import { CHUNK_SIZES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import DomainSelector from "@/components/onboarding/DomainSelector";
import ReadingAidToggle from "@/components/onboarding/ReadingAidToggle";
import StepIndicator from "@/components/onboarding/StepIndicator";
import type { Domain } from "@/types";

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const { preferences, updatePreferences } = useUserStore();
  const [step, setStep] = useState(0);
  const [domains, setDomains] = useState<Domain[]>(preferences?.domains ?? ["business", "science"]);
  const [chunkSize, setChunkSize] = useState<2 | 3>(preferences?.chunk_size ?? 2);
  const [guide, setGuide] = useState(preferences?.guide_enabled ?? true);
  const [saving, setSaving] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    await updatePreferences({ domains, chunk_size: chunkSize, guide_enabled: guide });
    setSaving(false);
    navigate("/calibration");
  };

  const steps = [
    // Step 0 — Welcome
    <div key="welcome" className="text-center space-y-6">
      <div className="text-6xl">⚡</div>
      <h1 className="text-3xl font-black text-white">Welcome to ReadShift</h1>
      <p className="text-slate-400 max-w-sm mx-auto">
        Train your brain to read faster without losing comprehension.
        Three science-backed techniques, adapted to your pace.
      </p>
      <Button size="lg" onClick={next}>Get Started →</Button>
    </div>,

    // Step 1 — Domains
    <div key="domains" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white">Choose Your Domains</h2>
        <p className="text-slate-400 text-sm mt-1">What content would you like to practise with?</p>
      </div>
      <DomainSelector selected={domains} onChange={setDomains} />
      <div className="flex gap-3">
        <Button variant="ghost" onClick={prev}>← Back</Button>
        <Button className="flex-1" onClick={next} disabled={domains.length === 0}>Continue →</Button>
      </div>
    </div>,

    // Step 2 — Reading aids
    <div key="aids" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white">Reading Preferences</h2>
        <p className="text-slate-400 text-sm mt-1">You can change these any time in Settings.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/4 divide-y divide-white/8">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-white">Chunk Size</p>
            <p className="text-xs text-slate-500">Words highlighted together</p>
          </div>
          <div className="flex gap-2">
            {CHUNK_SIZES.map((cs) => (
              <button key={cs.value} onClick={() => setChunkSize(cs.value)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  chunkSize === cs.value ? "bg-indigo-500 text-white" : "bg-white/8 text-slate-400 hover:text-white")}>
                {cs.value}
              </button>
            ))}
          </div>
        </div>
        <ReadingAidToggle
          label="Pacing Guide"
          description="Horizontal line to follow"
          value={guide}
          onChange={setGuide}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={prev}>← Back</Button>
        <Button className="flex-1" isLoading={saving} onClick={handleFinish}>
          Calibrate My Speed →
        </Button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-slate-950">
      <div className="w-full max-w-lg space-y-8">
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
