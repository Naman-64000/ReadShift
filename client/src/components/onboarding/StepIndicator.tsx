/**
 * client/src/components/onboarding/StepIndicator.tsx
 *
 * Progress indicator for the multi-step onboarding flow.
 *
 * What this component will do:
 *  - Display a row of step dots or numbered steps.
 *  - Highlight the current step and show completed steps.
 *  - Accept: currentStep: number, totalSteps: number.
 *  - Animate step transitions.
 */

import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label="Onboarding progress">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === currentStep ? "w-8 bg-indigo-500" : i < currentStep ? "w-4 bg-indigo-500/40" : "w-4 bg-white/15"
          )}
        />
      ))}
    </div>
  );
}
