/**
 * client/src/components/session/WpmSlider.tsx
 */

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { WPM_MIN, WPM_MAX, WPM_STEP } from "@/lib/constants";

interface WpmSliderProps {
  value: number;
  onChange: (wpm: number) => void;
  recommendedWpm?: number;
  className?: string;
}

export default function WpmSlider({ value, onChange, recommendedWpm, className }: WpmSliderProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(e.target.value);
      const snapped = Math.round(raw / WPM_STEP) * WPM_STEP;
      onChange(snapped);
    },
    [onChange]
  );

  // Descriptive speed label based on WPM range
  const getSpeedLabel = (wpm: number) => {
    if (wpm < 180) return { label: "Comfortable Pace", desc: "Solid everyday reading speed" };
    if (wpm < 250) return { label: "Advanced Pace",  desc: "Competitive reading speed" };
    return { label: "Elite Pace",     desc: "High-performance reading" };
  };
  const { label: speedLabel, desc: speedDesc } = getSpeedLabel(value);

  return (
    <div className={cn("space-y-5", className)}>
      {/* Current WPM display */}
      <div className="text-center">
        <div className="text-6xl font-black text-[rgb(var(--text))] tabular-nums tracking-tight">
          {value}
        </div>
        <div className="text-base font-semibold text-indigo-400 mt-1">WPM</div>
        <div className="text-sm text-slate-400 mt-0.5">
          {speedLabel}{speedDesc ? ` — ${speedDesc}` : ""}
        </div>
      </div>

      {/* Slider track */}
      <div className="relative">

        <input
          id="wpm-slider"
          type="range"
          min={WPM_MIN}
          max={WPM_MAX}
          step={WPM_STEP}
          value={value}
          onChange={handleChange}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-white/10 accent-indigo-500",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500",
            "[&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-indigo-500/50",
            "[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
          )}
        />

        {/* Level markers */}
        <div className="flex justify-between mt-2 px-1 text-[11px] font-bold text-slate-600 uppercase tracking-tighter">
          {[100, 125, 150, 175, 200, 225, 250, 275, 300].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
      </div>

      {/* Recommended quick-set */}
      {recommendedWpm && recommendedWpm !== value && (
        <button
          onClick={() => onChange(recommendedWpm)}
          className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Use recommended: {recommendedWpm} WPM →
        </button>
      )}
    </div>
  );
}
