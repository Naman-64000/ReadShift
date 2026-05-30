/**
 * client/src/components/onboarding/ReadingAidToggle.tsx
 *
 * Toggle card for a single reading aid preference (fading, guide, chunk size).
 *
 * What this component will do:
 *  - Render a toggle switch alongside an icon, label, and short description.
 *  - Accept: label, description, value: boolean, onChange: (v: boolean) => void.
 *  - Used in both onboarding and the settings screen.
 */

import { cn } from "@/lib/utils";

interface ReadingAidToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function ReadingAidToggle({ label, description, value, onChange }: ReadingAidToggleProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={cn("relative h-6 w-10 rounded-full transition-colors", value ? "bg-indigo-500" : "bg-white/15")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            value ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
