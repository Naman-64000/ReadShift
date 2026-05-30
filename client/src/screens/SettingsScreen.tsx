import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/store";
import Button from "@/components/shared/Button";
import { DOMAINS, CHUNK_SIZES, FONT_SIZES, COL_WIDTHS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Domain, UserPreferences } from "@/types";

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { user, preferences, updatePreferences, fetchProfile, isLoading, error } = useUserStore();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<UserPreferences | null>(null);

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
          <div className="rounded-2xl border border-white/10 bg-white/4 divide-y divide-white/8 overflow-hidden">
            {/* Column Width */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm font-medium text-white">Line Width</p>
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
            <div className="flex items-center justify-between px-5 py-5">
              <p className="text-sm font-medium text-white">Font Size</p>
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
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <p className="text-sm font-medium text-white">Highlight Chunk</p>
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
            <div className="flex items-center justify-between px-5 py-5">
              <p className="text-sm font-medium text-white">Pacing Guide Line</p>
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

            <div className="flex items-center justify-between px-5 py-5">
              <p className="text-sm font-medium text-white">1.5s Text Fading</p>
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
