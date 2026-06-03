import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/store";
import Button from "@/components/shared/Button";
import { DOMAINS, CHUNK_SIZES, FONT_SIZES, COL_WIDTHS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Domain, UserPreferences } from "@/types";

const MCQ_TIMER_VALUES = [
  0, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180
];

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { user, preferences, updatePreferences, fetchProfile, isLoading, error } = useUserStore();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<UserPreferences | null>(null);
  const [hoveredPreview, setHoveredPreview] = useState<string | null>(null);
  const [allowHover, setAllowHover] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  useEffect(() => {
    let initialCoords: { x: number; y: number } | null = null;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!initialCoords) {
        initialCoords = { x: e.clientX, y: e.clientY };
        return;
      }
      
      const deltaX = Math.abs(e.clientX - initialCoords.x);
      const deltaY = Math.abs(e.clientY - initialCoords.y);
      
      if (deltaX > 5 || deltaY > 5) {
        setAllowHover(true);
        window.removeEventListener("mousemove", handleMouseMove);
      }
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (!user || !preferences) {
      fetchProfile();
    }
  }, [user, preferences, fetchProfile]);

  useEffect(() => {
    if (preferences) setDraft(preferences);
  }, [preferences]);

  const handleSignOut = async () => {
    localStorage.removeItem("readshift_dev_user");
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const updateDraft = useCallback((patch: Partial<UserPreferences>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft || !preferences) return;
    setSaving(true);
    await updatePreferences({
      domains: draft.domains,
      col_width: draft.col_width,
      font_size_px: draft.font_size_px,
      chunk_size: draft.chunk_size,
      guide_enabled: draft.guide_enabled,
      fading_enabled: draft.fading_enabled,
      mcq_timer: draft.mcq_timer ?? 0,
      highlight_intensity: draft.highlight_intensity ?? "moderate",
      auto_center_scroll: draft.auto_center_scroll ?? true,
      laap_enabled: draft.laap_enabled ?? true,
      skim_enabled: draft.skim_enabled ?? true,
      mcqs_enabled: draft.mcqs_enabled ?? true,
      progress_bar_enabled: draft.progress_bar_enabled ?? true,
      timer_enabled: draft.timer_enabled ?? true,
      roadmaps_enabled: draft.roadmaps_enabled ?? true,
    });
    setSaving(false);
  }, [draft, preferences, updatePreferences]);

  if ((!user || !preferences) && isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 font-medium">Loading settings...</div>
      </div>
    );
  }

  if ((!user || !preferences) && error) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-red-500/10 p-5 space-y-3">
          <p className="text-sm text-red-200">Could not load settings: {error}</p>
          <Button onClick={() => fetchProfile()} className="w-full">Retry</Button>
        </div>
      </div>
    );
  }

  if (!user || !preferences || !draft) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-slate-500 font-medium">Preparing settings...</div>
      </div>
    );
  }

  const isDevUser = user.email === "dev@readshift.local";
  const isDirty = JSON.stringify(draft) !== JSON.stringify(preferences);

  const isLearningModeActive =
    draft?.guide_enabled === true &&
    draft?.fading_enabled === true &&
    (draft?.highlight_intensity === "moderate" || draft?.highlight_intensity === "intense") &&
    draft?.auto_center_scroll === true &&
    draft?.laap_enabled === true &&
    draft?.chunk_size === 3 &&
    (draft?.skim_enabled ?? true) === true &&
    (draft?.progress_bar_enabled ?? true) === true &&
    (draft?.timer_enabled ?? true) === true &&
    (draft?.roadmaps_enabled ?? true) === true;

  const isTestModeActive =
    draft?.guide_enabled === false &&
    draft?.fading_enabled === false &&
    draft?.highlight_intensity === "none" &&
    draft?.auto_center_scroll === false &&
    draft?.laap_enabled === false &&
    draft?.chunk_size === 4 &&
    draft?.skim_enabled === false &&
    draft?.progress_bar_enabled === false &&
    draft?.timer_enabled === false &&
    (draft?.roadmaps_enabled ?? true) === false;

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 px-4 py-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto space-y-10"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[rgb(var(--text))]">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              {isDevUser ? "Development Mode User" : user.email}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
            {user.email?.[0].toUpperCase()}
          </div>
        </div>


        {/* Content Preference */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Content Domains
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {DOMAINS.map((d) => {
              const selected = draft.domains.includes(d.value as Domain);
              return (
                <button
                  key={d.value}
                  onClick={() => {
                    const next = selected
                      ? draft.domains.filter((x) => x !== d.value)
                      : [...draft.domains, d.value as Domain];
                    if (next.length > 0) updateDraft({ domains: next });
                  }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all",
                    selected
                      ? "border-indigo-500 bg-indigo-500/15 text-[rgb(var(--text))]"
                      : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-[rgb(var(--text))]"
                  )}
                >
                  <span className="mr-2 opacity-80">{d.emoji}</span>
                  {d.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Preset Modes */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Quick Presets / Modes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                updateDraft({
                  guide_enabled: true,
                  fading_enabled: true,
                  highlight_intensity: "intense",
                  auto_center_scroll: true,
                  laap_enabled: true,
                  chunk_size: 3,
                  skim_enabled: true,
                  progress_bar_enabled: true,
                  timer_enabled: true,
                  roadmaps_enabled: true,
                });
              }}
              className={cn(
                "rounded-2xl border p-5 text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[190px] group",
                isLearningModeActive
                  ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-white"
                  : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-white"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                    <span>🎓</span> Learn Mode
                  </div>
                  {isLearningModeActive && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-normal">
                  Optimized for speed-reading acquisition. Focuses your eyes and trains cognitive retention.
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-white/5">
                  {[
                    "✓ Skimming Warmup",
                    "✓ Bold Highlighting",
                    "✓ Horizontal Line",
                    "✓ Regression Fading",
                    "✓ Auto-Center Focus",
                    "✓ Adaptive Pacing",
                    "✓ HUD Progress Bar",
                    "✓ HUD Pacing Timer",
                    "✓ Paragraph Roadmaps"
                  ].map((feat) => (
                    <span key={feat} className="text-[9px] font-semibold text-emerald-400/90 flex items-center gap-1">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                updateDraft({
                  guide_enabled: false,
                  fading_enabled: false,
                  highlight_intensity: "none",
                  auto_center_scroll: false,
                  laap_enabled: false,
                  chunk_size: 4,
                  skim_enabled: false,
                  progress_bar_enabled: false,
                  timer_enabled: false,
                  roadmaps_enabled: false,
                });
              }}
              className={cn(
                "rounded-2xl border p-5 text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[190px] group",
                isTestModeActive
                  ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white"
                  : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-white"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-black text-white group-hover:text-indigo-400 transition-colors">
                    <span>⏱️</span> Test Mode
                  </div>
                  {isTestModeActive && (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-normal">
                  Simulates strict exam conditions. Disables visual scaffolding for raw comprehension measurement.
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-white/5">
                  {[
                    "✗ No Skimming",
                    "✗ No Word Boldness",
                    "✗ No Pacing Guide Line",
                    "✗ No Text Fading",
                    "✗ Normal Manual Scroll",
                    "✗ No Speed Assists",
                    "✗ No HUD Progress Bar",
                    "✗ No HUD Pacing Timer",
                    "✗ No Roadmaps"
                  ].map((feat) => (
                    <span key={feat} className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Method Manual Card */}
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-300" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>📖</span> Cognitive Training Manual
            </h3>
            <p className="text-[11px] text-slate-400 font-medium max-w-sm sm:max-w-md">
              Learn the exact 16-point scientific reading method and discover how ReadShift's visual pacing assists automate these cognitive habits.
            </p>
          </div>
          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-2 shrink-0 rounded-xl text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer shadow-lg shadow-indigo-500/5"
          >
            Open Manual
          </button>
        </section>

        {/* Visual Prefs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Reading Display
            </h2>
            {isDirty && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white px-3.5 py-1.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/5 cursor-pointer"
              >
                {saving ? "Saving…" : "💾 Save Changes"}
              </motion.button>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/4 divide-y divide-white/5">
            {/* Column Width */}
            <div 
              className="relative flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 transition-colors hover:bg-white/5 first:rounded-t-2xl gap-3 sm:gap-0"
              onMouseEnter={() => allowHover && setHoveredPreview("widthRow")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "widthRow" && <WidthRowPreview />}
              
              <div className="space-y-1 self-start">
                <p className="text-sm font-medium text-white cursor-help">Line Width</p>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                {COL_WIDTHS.map((cw) => (
                  <button
                    key={cw.value}
                    onClick={() => updateDraft({ col_width: cw.value })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold transition-all border",
                      draft.col_width === cw.value
                        ? "bg-indigo-500 border-indigo-400 text-white"
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {cw.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div 
              className="relative flex flex-col sm:flex-row sm:items-center justify-between px-5 py-5 transition-colors hover:bg-white/5 gap-3 sm:gap-0"
              onMouseEnter={() => allowHover && setHoveredPreview("fontRow")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "fontRow" && <FontRowPreview />}
              <p className="text-sm font-medium text-white cursor-help self-start">Font Size</p>
              <div className="grid grid-cols-4 gap-1.5 w-full sm:flex sm:gap-2 sm:w-auto">
                {FONT_SIZES.map((fs) => (
                  <button
                    key={fs.value}
                    onClick={() => updateDraft({ font_size_px: fs.value })}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                      draft.font_size_px === fs.value
                        ? "bg-indigo-500 border-indigo-400 text-white"
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {fs.value}px
                  </button>
                ))}
              </div>
            </div>

            {/* Chunk size */}
            <div 
              className="relative flex flex-col sm:flex-row sm:items-center justify-between px-5 py-5 transition-colors hover:bg-white/5 gap-3 sm:gap-0"
              onMouseEnter={() => allowHover && setHoveredPreview("chunkRow")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "chunkRow" && <ChunkRowPreview />}
              <div className="self-start">
                <p className="text-sm font-medium text-white cursor-help">Highlight Chunk</p>
                <p className="text-[10px] text-slate-500">Words highlighted per tick</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 w-full sm:flex sm:gap-2 sm:w-auto">
                {CHUNK_SIZES.map((cs) => (
                  <button
                    key={cs.value}
                    onClick={() => updateDraft({ chunk_size: cs.value })}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                      draft.chunk_size === cs.value
                        ? "bg-indigo-500 border-indigo-400 text-white"
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {cs.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Highlight Intensity Row */}
            <div 
              className="relative flex flex-col sm:flex-row sm:items-center justify-between px-5 py-5 transition-colors hover:bg-white/5 gap-3 sm:gap-0"
              onMouseEnter={() => allowHover && setHoveredPreview("highlightIntensity")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "highlightIntensity" && <HighlightIntensityPreview />}
              
              <div className="self-start">
                <p className="text-sm font-medium text-white cursor-help">Highlight Focus</p>
                <p className="text-[10px] text-slate-500">Visual weight of the focus highlight</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 w-full sm:flex sm:gap-2 sm:w-auto">
                {(["none", "subtle", "moderate", "intense"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => updateDraft({ highlight_intensity: level })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold transition-all border capitalize",
                      (draft.highlight_intensity ?? "moderate") === level
                        ? "bg-indigo-500 border-indigo-400 text-white"
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {level === "intense" ? "Bold" : level === "none" ? "None" : level}
                  </button>
                ))}
              </div>
            </div>

            {/* LAAP (Linguistic-Aware Adaptive Pacing) toggle row */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
              onMouseEnter={() => allowHover && setHoveredPreview("laap")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "laap" && <LaapPreview />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">Adaptive Pacing (LAAP)</p>
                <p className="text-[10px] text-slate-500">Varying speed by word complexity for a smooth, natural pacing flow</p>
              </div>
              <button
                onClick={() => updateDraft({ laap_enabled: !(draft.laap_enabled ?? true) })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  (draft.laap_enabled ?? true) ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  (draft.laap_enabled ?? true) ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Auto-Center Focus */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
              onMouseEnter={() => allowHover && setHoveredPreview("autoCenter")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "autoCenter" && <AutoCenterPreview enabled={draft.auto_center_scroll ?? true} />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">Auto-Center Focus</p>
                <p className="text-[10px] text-slate-500">Centering active highlight on every line change</p>
              </div>
              <button
                onClick={() => updateDraft({ auto_center_scroll: !(draft.auto_center_scroll ?? true) })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  (draft.auto_center_scroll ?? true) ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  (draft.auto_center_scroll ?? true) ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Pacing Guide Line */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
              onMouseEnter={() => allowHover && setHoveredPreview("guide")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "guide" && <PacingGuidePreview />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">Pacing Guide Line</p>
              </div>
              <button
                onClick={() => updateDraft({ guide_enabled: !draft.guide_enabled })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  draft.guide_enabled ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  draft.guide_enabled ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* 1.5s Text Fading */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
              onMouseEnter={() => allowHover && setHoveredPreview("fading")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "fading" && <TextFadingPreview />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">1.5s Text Fading</p>
              </div>
              <button
                onClick={() => updateDraft({ fading_enabled: !draft.fading_enabled })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  draft.fading_enabled ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  draft.fading_enabled ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Skimming Phase */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
              onMouseEnter={() => allowHover && setHoveredPreview("skim")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "skim" && <SkimPreview />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">Skimming Phase</p>
                <p className="text-[10px] text-slate-500">Enable 15s structural skimming before pacing starts</p>
              </div>
              <button
                onClick={() => updateDraft({ skim_enabled: !(draft.skim_enabled ?? true) })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  (draft.skim_enabled ?? true) ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  (draft.skim_enabled ?? true) ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* HUD Progress Bar Toggle */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5 cursor-help"
              onMouseEnter={() => allowHover && setHoveredPreview("hudBar")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "hudBar" && <HUDBarPreview />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">HUD Progress Bar</p>
                <p className="text-[10px] text-slate-500">Show completion progress bar at the top of navbar during reading</p>
              </div>
              <button
                onClick={() => updateDraft({ progress_bar_enabled: !(draft.progress_bar_enabled ?? true) })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  (draft.progress_bar_enabled ?? true) ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  (draft.progress_bar_enabled ?? true) ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* HUD Pacing Timer Toggle */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5 cursor-help"
              onMouseEnter={() => allowHover && setHoveredPreview("hudTimer")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "hudTimer" && <HUDTimerPreview />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">HUD Pacing Timer</p>
                <p className="text-[10px] text-slate-500">Show real-time elapsed pacing timer in navbar during reading</p>
              </div>
              <button
                onClick={() => updateDraft({ timer_enabled: !(draft.timer_enabled ?? true) })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  (draft.timer_enabled ?? true) ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  (draft.timer_enabled ?? true) ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Paragraph Roadmaps Toggle */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5 cursor-help"
              onMouseEnter={() => allowHover && setHoveredPreview("roadmaps")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "roadmaps" && <RoadmapsPreview />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">Paragraph Roadmaps</p>
                <p className="text-[10px] text-slate-500">Show a 5-second keyword flow summary overlay when completing a paragraph</p>
              </div>
              <button
                onClick={() => updateDraft({ roadmaps_enabled: !(draft.roadmaps_enabled ?? true) })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  (draft.roadmaps_enabled ?? true) ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  (draft.roadmaps_enabled ?? true) ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Comprehension Checks (MCQs) Toggle Row */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
            >
              <div>
                <p className="text-sm font-medium text-white">Comprehension Checks (MCQs)</p>
                <p className="text-[10px] text-slate-500">Provide multiple-choice questions after the reading session</p>
              </div>
              <button
                onClick={() => updateDraft({ mcqs_enabled: !(draft.mcqs_enabled ?? true) })}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  (draft.mcqs_enabled ?? true) ? "bg-indigo-500" : "bg-white/10"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  (draft.mcqs_enabled ?? true) ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* MCQ Question Timer Row */}
            <div 
              className={cn(
                "relative flex flex-col px-5 py-5 transition-colors hover:bg-white/5 last:rounded-b-2xl gap-4",
                !(draft.mcqs_enabled ?? true) && "opacity-40 bg-black/10"
              )}
              onMouseEnter={() => allowHover && (draft.mcqs_enabled ?? true) && setHoveredPreview("mcqTimer")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "mcqTimer" && <MCQTimerPreview value={draft.mcq_timer ?? 0} />}
              
              <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0", !(draft.mcqs_enabled ?? true) && "pointer-events-none")}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white cursor-help">MCQ Question Timer</p>
                    {!(draft.mcqs_enabled ?? true) && (
                      <span className="text-[9px] font-bold text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full select-none">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {!(draft.mcqs_enabled ?? true)
                      ? "Requires Comprehension Checks (MCQs) to be turned on"
                      : "Allowed time per assessment question"}
                  </p>
                </div>
                
                {/* Segmented Mode Control */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    disabled={!(draft.mcqs_enabled ?? true)}
                    onClick={() => updateDraft({ mcq_timer: 0 })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      (draft.mcq_timer ?? 0) === 0
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Untimed
                  </button>
                  <button
                    type="button"
                    disabled={!(draft.mcqs_enabled ?? true)}
                    onClick={() => {
                      if ((draft.mcq_timer ?? 0) === 0) {
                        updateDraft({ mcq_timer: 45 });
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      (draft.mcq_timer ?? 0) > 0
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Timed
                  </button>
                </div>
              </div>

              {/* Conditionally reveal slider if Timed mode is active and MCQs are enabled */}
              {(draft.mcq_timer ?? 0) > 0 && (draft.mcqs_enabled ?? true) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-4 justify-between pt-2 border-t border-white/5"
                >
                  <span className="text-xs text-slate-400">Set Duration:</span>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    <input
                      type="range"
                      min={1}
                      max={MCQ_TIMER_VALUES.length - 1}
                      step={1}
                      value={Math.max(1, MCQ_TIMER_VALUES.indexOf(draft.mcq_timer ?? 45))}
                      onChange={(e) => {
                        const idx = Math.max(1, parseInt(e.target.value, 10));
                        updateDraft({ mcq_timer: MCQ_TIMER_VALUES[idx] });
                      }}
                      className="w-32 sm:w-40 accent-indigo-500 bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-indigo-400 w-16 text-right shrink-0">
                      {draft.mcq_timer}s
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-3 pt-6 border-t border-white/5">
          <Button className="w-full" onClick={handleSave} isLoading={saving} disabled={!isDirty}>
            Save Changes
          </Button>
          {isDevUser && (
            <p className="text-center text-xs text-slate-500">Development user session is active.</p>
          )}
          <Button variant="secondary" className="w-full" onClick={() => navigate("/calibration")}>
            🔄 Retake WPM Calibration
          </Button>
          <Button variant="ghost" className="w-full text-red-400 hover:text-red-300 hover:bg-red-400/5" onClick={handleSignOut}>
            Sign Out
          </Button>
        </section>
      </motion.div>

      {/* Cognitive Training Manual Modal Overlay */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0b101c]/95 border border-indigo-500/20 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
            >
              {/* Top Accent Line */}
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📖</span>
                  <div>
                    <h2 className="text-base font-black text-white">ReadShift Cognitive Manual</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scientific Reading & Pacing Framework</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="h-8 w-8 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-6 md:p-8 space-y-6 flex-1 scrollbar-thin scrollbar-thumb-indigo-500/25">
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">The Core Framework</h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed italic">
                    "Don't read passages just to finish them; read them to extract the purpose of each paragraph, build a passage map, understand the structure, and critically engage with the author's arguments."
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Point 1 */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-indigo-500/15 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400">1</span>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-white">First Understand WHY You Are Reading</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Do not read merely to absorb passive knowledge. Read specifically for CAT/GMAT level prep. Focus on improving deep comprehension, interpretation skills under pacing, getting comfortable with dense unfamiliar topics, and mastering global and local reading comprehension questions.
                        </p>
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-300 font-medium">
                          💡 <span className="font-bold text-indigo-400">ReadShift Advantage:</span> Provides highly-dense academic passages in business, humanities, and sciences paired with GMAT-calibrated question blueprints (e.g. main idea, inference, tone, unstated assumptions) to match target exam conditions perfectly.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Point 2 */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-indigo-500/15 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400">2</span>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-white">Quality Over Quantity</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Avoid asking how many articles you should read. Focus entirely on how well you are reading them. One highly focused, deeply analyzed passage is infinitely better than rushing through several articles without critical engagement.
                        </p>
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-300 font-medium">
                          💡 <span className="font-bold text-indigo-400">ReadShift Advantage:</span> Rather than encouraging endless scrolling, ReadShift saves your comprehensive session history in a clean reading log to monitor your deliberate progress, comfort thresholds, and error rates.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Point 3 */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-indigo-500/15 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400">3</span>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-white">Ignore Generic "Speed Reading"</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Do NOT work strictly on speed. Work on understanding, active comprehension, and deep interpretation. Speed is a natural, secondary byproduct of ocular habits and mental mapping comfort—it will improve automatically later.
                        </p>
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-300 font-medium">
                          💡 <span className="font-bold text-indigo-400">ReadShift Advantage:</span> Our Linguistic-Aware Adaptive Pacing (LAAP) does not force an artificial, flat speed. It distributes highlight durations dynamically by evaluating word complexity, syllable weights, and sentence transitions, keeping you at a highly receptive, natural rhythm.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Point 4 & 5 */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-indigo-500/15 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400">4</span>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-white">The Two-Round Pacing Routine</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Break your session into two distinct phases: Round 1 (Basic Comprehension), where you follow the passage structure and paragraph flows, and Round 2 (Deep Engagement), where you unpack dense sentences, check vocabulary, and dissect reasoning arguments. Spend roughly 25-30 minutes per passage set.
                        </p>
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-300 font-medium">
                          💡 <span className="font-bold text-indigo-400">ReadShift Advantage:</span> Round 1 is guided strictly by our pacing highlighting line. Round 2 is fully automated during the post-reading check, where you receive extensive explanations detailing why correct and incorrect distractors are structured as logical traps.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Point 6 & 8 */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-indigo-500/15 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400">5</span>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-white">Create a Passage Map & Compress Summaries</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          After every single paragraph, ask: "Why did the author include this paragraph?" instead of "What did I just read?" Write a highly-compressed 3-5 word summary of the paragraph's core purpose to build a mental structure map.
                        </p>
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-300 font-medium">
                          💡 <span className="font-bold text-indigo-400">ReadShift Advantage:</span> Paragraph Roadmaps automate this training! At the end of every paragraph, ReadShift pauses pacing silently for 5 seconds to overlay a high-retention 3-4 word keyword transition summary, teaching your brain structural mapping.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Point 7 */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-indigo-500/15 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400">6</span>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-white">Find the "Hero Sentence"</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Not all lines are equally important. Locate the single "Hero Sentence" that carries the paragraph's primary logical purpose (often the first structural claim sentence), and ignore excessive descriptive details during the first pass.
                        </p>
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-300 font-medium">
                          💡 <span className="font-bold text-indigo-400">ReadShift Advantage:</span> Structural Skimming (15s Warmup) dims the background and highlights only paragraph-initial sentences before pacing begins, training your eyes to instantly latch onto "Hero Sentences."
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Point 9 & 10 */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-indigo-500/15 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400">7</span>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-white">Track Connections & Don't Get Stuck</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Always analyze how each paragraph connects back to the previous one. If a sentence becomes dense and confusing, do not stall or re-read endlessly. Keep moving forward, holding the macro-structure together in your mind.
                        </p>
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-300 font-medium">
                          💡 <span className="font-bold text-indigo-400">ReadShift Advantage:</span> 1.5s Regression Fading physically fades words after they are paced. Cognitive eye-tracking research shows visual regressions (backtracking) waste up to 15% of reading speed. Fading stops this habit, keeping you anchored to the global picture.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Point 11 to 15 */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-indigo-500/15 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-black text-indigo-400">8</span>
                      <div className="space-y-2">
                        <h4 className="text-sm font-black text-white">Practice Skepticism & Challenge the Author</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Do NOT blindly agree with the text. Practice reasoning skepticism: What unstated assumptions is the author relying on? What evidence is missing? What would weaken or strengthen their claim? Mentally debate the author.
                        </p>
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-300 font-medium">
                          💡 <span className="font-bold text-indigo-400">ReadShift Advantage:</span> Our comprehension MCQs explicitly integrate GMAT distractor traps (Out of Scope, Extreme Language, True but Irrelevant, Direct Contradiction, Misapplied Relationship), training your mind to actively eliminate logical traps and spot logical flaws.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end items-center px-6 py-4 border-t border-white/5 bg-slate-950/40 gap-3">
                <Button
                  onClick={() => setShowManualModal(false)}
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

function TextFadingPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-52 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">Fading Effect</div>
      <div className="space-y-2.5">
        <motion.div
          animate={{ opacity: [1, 0.2, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 1] }}
          className="h-2 w-full bg-slate-500 rounded-full"
        />
        <motion.div
          animate={{ opacity: [1, 1, 0.2], backgroundColor: ["#64748b", "#818cf8", "#64748b"] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1] }}
          className="h-2 w-5/6 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]"
        />
        <motion.div
          animate={{ opacity: [1, 1, 1], backgroundColor: ["#64748b", "#64748b", "#818cf8"] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1] }}
          className="h-2 w-4/6 rounded-full"
        />
      </div>
    </motion.div>
  );
}

function PacingGuidePreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-52 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">Pacing Guide</div>
      <div className="relative space-y-2.5 py-1">
        <div className="h-2 w-full bg-slate-600 rounded-full" />
        <div className="h-2 w-5/6 bg-slate-600 rounded-full" />
        <div className="h-2 w-4/6 bg-slate-600 rounded-full" />
        <div className="h-2 w-full bg-slate-600 rounded-full" />
        
        {/* Animated Line */}
        <motion.div
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-[2px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] z-10"
        />
      </div>
    </motion.div>
  );
}


function WidthRowPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-60 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none flex flex-col items-center"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">
        Line Width Demo
      </div>
      <motion.div 
        animate={{ width: ["7rem", "10rem", "13rem", "7rem"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="space-y-2"
      >
        <div className="h-2 bg-indigo-400 rounded-full w-full" />
        <div className="h-2 bg-indigo-400 rounded-full w-5/6 mx-auto" />
        <div className="h-2 bg-indigo-400 rounded-full w-full" />
      </motion.div>
    </motion.div>
  );
}

function FontRowPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-64 p-5 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">
        Dynamic Resizing
      </div>
      <motion.div
        animate={{ fontSize: ["16px", "18px", "21px", "16px"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="text-slate-200" style={{ lineHeight: 1.6 }}
      >
        Text scales to fit your reading preference comfortably.
      </motion.div>
    </motion.div>
  );
}

function ChunkRowPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-60 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-4 font-bold uppercase tracking-wider text-center">
        Highlight Density
      </div>
      <div className="space-y-4">
        <div>
          <div className="text-[9px] text-slate-500 mb-1 text-center">3 Words</div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {Array.from({length: 6}).map((_, i) => (
              <motion.div
                key={i}
                className="h-2 w-6 rounded-full"
                animate={{ backgroundColor: ["#475569", "#818cf8", "#818cf8", "#475569", "#475569"] }}
                transition={{ duration: 2, repeat: Infinity, times: [0, 0.05, 0.45, 0.5, 1], delay: Math.floor(i/3) * 1 }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-slate-500 mb-1 text-center">4 Words</div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {Array.from({length: 8}).map((_, i) => (
              <motion.div
                key={i}
                className="h-2 w-6 rounded-full"
                animate={{ backgroundColor: ["#475569", "#818cf8", "#818cf8", "#475569", "#475569"] }}
                transition={{ duration: 2, repeat: Infinity, times: [0, 0.05, 0.45, 0.5, 1], delay: Math.floor(i/4) * 1 }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MCQTimerPreview({ value }: { value: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-60 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">
        MCQ Timer Preview
      </div>
      <div className="p-3 bg-white/4 rounded-lg border border-white/5 space-y-2 text-center">
        {value === 0 ? (
          <>
            <div className="text-xl font-black text-indigo-400">♾️</div>
            <p className="text-xs text-slate-300 font-medium">Untimed Practice Mode</p>
            <p className="text-[9px] text-slate-500">Navigate back and forth between questions freely.</p>
          </>
        ) : (
          <>
            <div className="text-xl font-mono text-amber-400 font-bold">
              {value}s
            </div>
            <p className="text-xs text-slate-300 font-medium">Timed Practice Mode</p>
            <p className="text-[9px] text-slate-500">Answer sequentially under strict time pressure.</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

function HighlightIntensityPreview() {
  const [level, setLevel] = useState<"none" | "subtle" | "moderate" | "intense">("none");

  useEffect(() => {
    const timer = setInterval(() => {
      setLevel((prev) => {
        if (prev === "none") return "subtle";
        if (prev === "subtle") return "moderate";
        if (prev === "moderate") return "intense";
        return "none";
      });
    }, 1100);
    return () => clearInterval(timer);
  }, []);

  const headings = {
    none: "None (Raw Reading)",
    subtle: "Subtle (Soft Wash Focus)",
    moderate: "Moderate (Balanced Focus)",
    intense: "Bold (High Intensity Focus)",
  };

  const guidelines = {
    none: "Traditional reading with zero active visual guidance.",
    subtle: "Best for minimal visual aid and natural pacing focus.",
    moderate: "Ideal for standard speed training & structural rhythm.",
    intense: "Excellent for aggressive speed building & complex text.",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-60 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center h-4">
        {headings[level]}
      </div>
      <div className="relative py-5 text-center">
        <span className={cn(
          "relative transition-all duration-300 px-4 py-1.5 select-none text-sm inline-block rounded",
          level === "none" ? "text-slate-400 font-normal" : "text-white",
          level === "subtle" && "font-medium",
          level === "moderate" && "font-bold",
          level === "intense" && "font-black text-indigo-200"
        )}>
          <motion.span
            animate={{
              backgroundColor: level === "none" ? "rgba(0,0,0,0)" : level === "subtle" ? "rgba(99, 102, 241, 0.15)" : level === "moderate" ? "rgba(99, 102, 241, 0.30)" : "rgba(99, 102, 241, 0.60)",
              borderColor: level === "none" ? "rgba(0,0,0,0)" : level === "subtle" ? "rgba(99, 102, 241, 0.20)" : level === "moderate" ? "rgba(99, 102, 241, 0.40)" : "rgba(99, 102, 241, 0.80)",
              left: level === "subtle" ? "-2px" : level === "moderate" ? "-8px" : level === "intense" ? "-14px" : "0px",
              right: level === "subtle" ? "-2px" : level === "moderate" ? "-8px" : level === "intense" ? "-14px" : "0px",
              top: level === "subtle" ? "0px" : level === "moderate" ? "-2px" : level === "intense" ? "-4px" : "0px",
              bottom: level === "subtle" ? "0px" : level === "moderate" ? "-2px" : level === "intense" ? "-4px" : "0px",
              boxShadow: level === "intense" ? "0 0 14px rgba(99, 102, 241, 0.5)" : "0 0 0px rgba(99, 102, 241, 0)",
            }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="absolute rounded border -z-10"
          />
          Focus Word
        </span>
      </div>
      <div className="text-[10px] text-slate-500 mt-4 pt-3 border-t border-white/5 text-center leading-relaxed h-8">
        {guidelines[level]}
      </div>
    </motion.div>
  );
}

function AutoCenterPreview({ enabled }: { enabled: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-52 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">
        {enabled ? "Auto-Center Focus" : "Free Will Scroll"}
      </div>
      <div className="h-24 bg-[#090d16] border border-white/5 rounded-lg overflow-hidden flex flex-col justify-center relative px-3 py-2">
        {enabled ? (
          // Centered mode demo
          <div className="space-y-2 relative">
            <div className="h-1.5 w-full bg-slate-700/40 rounded-full" />
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1.5 w-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            />
            <div className="h-1.5 w-full bg-slate-700/40 rounded-full" />
          </div>
        ) : (
          // Free will mode demo
          <div className="space-y-2">
            <motion.div
              animate={{ 
                backgroundColor: ["#818cf8", "#475569", "#475569", "#818cf8"],
                boxShadow: ["0 0 8px rgba(99,102,241,0.5)", "none", "none", "0 0 8px rgba(99,102,241,0.5)"]
              }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.33, 0.66, 1] }}
              className="h-1.5 w-full rounded-full"
            />
            <motion.div
              animate={{ 
                backgroundColor: ["#475569", "#818cf8", "#475569", "#475569"],
                boxShadow: ["none", "0 0 8px rgba(99,102,241,0.5)", "none", "none"]
              }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.33, 0.66, 1] }}
              className="h-1.5 w-full rounded-full"
            />
            <motion.div
              animate={{ 
                backgroundColor: ["#475569", "#475569", "#818cf8", "#475569"],
                boxShadow: ["none", "none", "0 0 8px rgba(99,102,241,0.5)", "none"]
              }}
              transition={{ duration: 4, repeat: Infinity, times: [0, 0.33, 0.66, 1] }}
              className="h-1.5 w-full rounded-full"
            />
          </div>
        )}
      </div>
      <p className="text-[9px] text-slate-500 text-center mt-2 leading-relaxed">
        {enabled 
          ? "Locks reading focus strictly to the center of the screen." 
          : "Allows free viewport scrolling. Text only scrolls when hitting borders."}
      </p>
    </motion.div>
  );
}

function LaapPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-60 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">Adaptive Pacing (LAAP)</div>
      <div className="space-y-3">
        {/* Simple vs Complex chunk comparison */}
        <div className="space-y-1 bg-white/4 rounded-lg p-2 border border-white/5">
          <div className="flex justify-between items-center text-[10px] text-indigo-400 font-semibold">
            <span>"and it is"</span>
            <span>Fast (90ms)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: ["0%", "100%", "0%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            />
          </div>
        </div>
        
        <div className="space-y-1 bg-white/4 rounded-lg p-2 border border-white/5">
          <div className="flex justify-between items-center text-[10px] text-indigo-400 font-semibold">
            <span>"methodological shift"</span>
            <span>Slow (240ms)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: ["0%", "100%", "0%"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            />
          </div>
        </div>
      </div>
      <div className="text-[9px] text-slate-500 text-center mt-3 leading-relaxed">
        Pacing is automatically distributed by syllable and word weight, matching your exact target WPM.
      </div>
    </motion.div>
  );
}

function SkimPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-64 p-5 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3.5 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
        <span>👁️</span> Structural Skimming
      </div>
      <div className="relative space-y-3.5 py-1 text-xs">
        {/* Paragraph 1 */}
        <div className="space-y-1">
          <motion.div 
            animate={{ 
              color: ["#cbd5e1", "#818cf8", "#cbd5e1"],
              textShadow: ["none", "0 0 8px rgba(129,140,248,0.4)", "none"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="font-bold text-[11px]"
          >
            The fundamental premise of speed reading...
          </motion.div>
          <div className="h-1.5 w-11/12 bg-white/5 rounded-full" />
          <div className="h-1.5 w-4/5 bg-white/5 rounded-full" />
        </div>
        
        {/* Paragraph 2 */}
        <div className="space-y-1">
          <motion.div 
            animate={{ 
              color: ["#cbd5e1", "#818cf8", "#cbd5e1"],
              textShadow: ["none", "0 0 8px rgba(129,140,248,0.4)", "none"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="font-bold text-[11px]"
          >
            By scanning anchor phrases before pacing...
          </motion.div>
          <div className="h-1.5 w-full bg-white/5 rounded-full" />
          <div className="h-1.5 w-3/4 bg-white/5 rounded-full" />
        </div>
      </div>
      <p className="text-[9px] text-slate-500 text-center mt-3.5 leading-relaxed border-t border-white/5 pt-2">
        Cognitive priming: guides the eyes to anchor the first sentence of paragraphs, building a conceptual map.
      </p>
    </motion.div>
  );
}

function HUDBarPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-52 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">
        HUD Progress Bar
      </div>
      <div className="h-5 w-full bg-white/5 border border-white/8 rounded-lg overflow-hidden flex items-center relative px-2">
        <motion.div
          animate={{ width: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="h-1 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] rounded animate-pulse"
        />
      </div>
      <p className="text-[9px] text-slate-500 text-center mt-2.5 leading-relaxed">
        A high-performance linear bar at the top of the screen showing your completion percentage.
      </p>
    </motion.div>
  );
}

function HUDTimerPreview() {
  const [seconds, setSeconds] = useState(15);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s >= 30 ? 15 : s + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-52 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">
        HUD Pacing Timer
      </div>
      <div className="h-8 w-full bg-white/5 border border-white/8 rounded-lg flex items-center justify-center font-mono font-bold text-indigo-400 text-sm">
        0:{seconds < 10 ? `0${seconds}` : seconds}
      </div>
      <p className="text-[9px] text-slate-500 text-center mt-2.5 leading-relaxed">
        Displays your exact active reading time to monitor visual speed bursts precisely.
      </p>
    </motion.div>
  );
}

function RoadmapsPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-64 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3.5 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
        <span>🗺️</span> Paragraph Roadmap
      </div>
      
      <div className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 space-y-3">
        <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
          End of Paragraph 1
        </div>
        
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-medium">
            <span className="text-indigo-400">Hypothesis</span>
            <span className="text-slate-500">→</span>
            <span className="text-indigo-400">Methodology</span>
            <span className="text-slate-500">→</span>
            <span className="text-indigo-400">Control Group</span>
          </div>
          <motion.div 
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded"
          />
        </div>
      </div>
      
      <p className="text-[9px] text-slate-500 text-center mt-3 leading-relaxed">
        Pauses paced highlighting silently for 5 seconds to overlay a high-retention structural map.
      </p>
    </motion.div>
  );
}
