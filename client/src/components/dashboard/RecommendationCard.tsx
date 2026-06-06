/**
 * client/src/components/dashboard/RecommendationCard.tsx
 */
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/store";
import Button from "@/components/shared/Button";
import { formatDomain } from "@/lib/utils";
import type { Domain } from "@/types";

interface RecommendationCardProps {
  recommendedWpm: number;
  recommendedDomain: Domain | null;
  currentWpm: number;
  baselineWpm: number;
  sessionsCompleted: number;
}

export default function RecommendationCard({
  recommendedWpm, recommendedDomain, currentWpm, baselineWpm, sessionsCompleted,
}: RecommendationCardProps) {
  const navigate = useNavigate();
  const { startSession } = useSessionStore();

  const isCalibrated = baselineWpm > 0;

  const handleStart = async () => {
    if (!isCalibrated) {
      navigate("/calibration");
      return;
    }
    await startSession({
      target_wpm: recommendedWpm,
      chunk_size: 2,
      fading_enabled: false,
      guide_enabled: true,
      domain: recommendedDomain ?? undefined,
    });
    navigate("/session/reading", { state: { fromStartSession: true } });
  };

  const baseline = sessionsCompleted === 0 ? baselineWpm : currentWpm;
  const delta = recommendedWpm - baseline;

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/8 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Recommended Next Session</p>
          <p className="text-2xl font-black text-white mt-1">
            {isCalibrated ? `${recommendedWpm} WPM` : "N/A"}
          </p>
          {isCalibrated && delta > 0 && (
            <p className="text-xs text-emerald-400 mt-0.5">↑ {delta} WPM from your current baseline</p>
          )}
          {recommendedDomain && (
            <p className="text-xs text-slate-400 mt-0.5">Focus: {formatDomain(recommendedDomain)}</p>
          )}
        </div>
        <span className="text-3xl">🎯</span>
      </div>
      <Button size="sm" onClick={handleStart} className="w-full text-white">
        {isCalibrated ? "Start this session →" : "Calibrate Speed →"}
      </Button>
    </div>
  );
}
