import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pt-14 px-4 py-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto space-y-10"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Settings</h1>
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
                      ? "border-indigo-500 bg-indigo-500/15 text-white"
                      : "border-white/10 bg-white/4 text-slate-400 hover:border-white/20 hover:text-white"
                  )}
                >
                  <span className="mr-2 opacity-80">{d.emoji}</span>
                  {d.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Visual Prefs */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Reading Display
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/4 divide-y divide-white/8">
            {/* Column Width */}
            <div 
              className="relative flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5 first:rounded-t-2xl"
              onMouseEnter={() => allowHover && setHoveredPreview("widthRow")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "widthRow" && <WidthRowPreview />}
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-white cursor-help">Line Width</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
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
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
              onMouseEnter={() => allowHover && setHoveredPreview("fontRow")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "fontRow" && <FontRowPreview />}
              <p className="text-sm font-medium text-white cursor-help">Font Size</p>
              <div className="flex gap-2">
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
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
              onMouseEnter={() => allowHover && setHoveredPreview("chunkRow")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "chunkRow" && <ChunkRowPreview />}
              <div>
                <p className="text-sm font-medium text-white cursor-help">Highlight Chunk</p>
                <p className="text-[10px] text-slate-500">Words highlighted per tick</p>
              </div>
              <div className="flex gap-2">
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

            {/* Toggles */}
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

            {/* Highlight Intensity Row */}
            <div 
              className="relative flex items-center justify-between px-5 py-5 transition-colors hover:bg-white/5"
              onMouseEnter={() => allowHover && setHoveredPreview("highlightIntensity")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "highlightIntensity" && <HighlightIntensityPreview intensity={draft.highlight_intensity ?? "moderate"} isSavedActive={true} />}
              {hoveredPreview === "intensitysubtle" && <HighlightIntensityPreview intensity="subtle" />}
              {hoveredPreview === "intensitymoderate" && <HighlightIntensityPreview intensity="moderate" />}
              {hoveredPreview === "intensityintense" && <HighlightIntensityPreview intensity="intense" />}
              
              <div>
                <p className="text-sm font-medium text-white cursor-help">Highlight Focus</p>
                <p className="text-[10px] text-slate-500">Visual weight of the focus highlight</p>
              </div>
              <div className="flex gap-2">
                {(["subtle", "moderate", "intense"] as const).map((level) => (
                  <button
                    key={level}
                    onMouseEnter={() => allowHover && setHoveredPreview(`intensity${level}`)}
                    onMouseLeave={() => allowHover && setHoveredPreview("highlightIntensity")}
                    onClick={() => updateDraft({ highlight_intensity: level })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-semibold transition-all border capitalize",
                      (draft.highlight_intensity ?? "moderate") === level
                        ? "bg-indigo-500 border-indigo-400 text-white"
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    )}
                  >
                    {level === "intense" ? "Bold" : level}
                  </button>
                ))}
              </div>
            </div>

            {/* MCQ Timer Row */}
            <div 
              className="relative flex flex-col px-5 py-5 transition-colors hover:bg-white/5 last:rounded-b-2xl gap-4"
              onMouseEnter={() => allowHover && setHoveredPreview("mcqTimer")}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              {hoveredPreview === "mcqTimer" && <MCQTimerPreview value={draft.mcq_timer ?? 0} />}
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                  <p className="text-sm font-medium text-white cursor-help">MCQ Question Timer</p>
                  <p className="text-[10px] text-slate-500">Allowed time per assessment question</p>
                </div>
                
                {/* Segmented Mode Control */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
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

              {/* Conditionally reveal slider if Timed mode is active */}
              {(draft.mcq_timer ?? 0) > 0 && (
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

function HighlightIntensityPreview({
  intensity,
  isSavedActive = false,
}: {
  intensity: "subtle" | "moderate" | "intense";
  isSavedActive?: boolean;
}) {
  const bgOpacity = intensity === "subtle" ? "bg-indigo-500/15" : intensity === "moderate" ? "bg-indigo-500/30" : "bg-indigo-500/60";
  const borderOpacity = intensity === "subtle" ? "border-indigo-500/20" : intensity === "moderate" ? "border-indigo-500/40" : "border-indigo-500/80";
  const paddingX = intensity === "subtle" ? "-inset-x-0.5 -inset-y-0" : intensity === "moderate" ? "-inset-x-2 -inset-y-0.5" : "-inset-x-3.5 -inset-y-1";
  const glowShadow = intensity === "intense" ? "shadow-[0_0_14px_rgba(99,102,241,0.5)]" : "";

  const headings = {
    subtle: "Subtle (Soft Wash Focus)",
    moderate: "Moderate (Balanced Focus)",
    intense: "Bold (High Intensity Focus)",
  };

  const headingText = isSavedActive
    ? `Active Focus: ${headings[intensity].split(" (")[0]}`
    : headings[intensity];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10, y: "-50%" }}
      animate={{ opacity: 1, x: 0, y: "-50%" }}
      className="absolute left-full top-1/2 ml-4 w-60 p-4 rounded-xl bg-[#0f172a] border border-white/10 shadow-2xl z-50 pointer-events-none"
    >
      <div className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-wider text-center">
        {headingText}
      </div>
      <div className="relative py-4 text-center">
        <span className="relative text-slate-200 text-sm font-medium px-4 select-none">
          <span className={cn("absolute rounded border -z-10 transition-all duration-300", bgOpacity, borderOpacity, paddingX, glowShadow)} />
          Focus Word
        </span>
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
