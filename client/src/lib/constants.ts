/**
 * client/src/lib/constants.ts
 * Application-wide constants derived from the ReadShift spec.
 */

import type { Domain, ColWidth } from "@/types";

// ── WPM Slider ────────────────────────────────────────────────
export const MIN_WPM = 100;
export const MAX_WPM = 300;
export const DEFAULT_WPM = 150;
export const WPM_MIN = 100;
export const WPM_MAX = 300;
export const WPM_STEP = 10;
export const WPM_DEFAULT = 150;

// ── Domains ───────────────────────────────────────────────────
export const DOMAINS: { value: Domain; label: string; description: string; emoji: string }[] = [
  { value: "philosophy",             label: "Philosophy",             description: "Logic, ethics, epistemology, conceptual reasoning",  emoji: "💡" },
  { value: "psychology",             label: "Psychology",             description: "Cognitive science, human behavior, mental processes", emoji: "🧠" },
  { value: "history",                label: "History",                description: "Historical events, historical development, past eras", emoji: "🏛️" },
  { value: "arts_and_museum",        label: "Arts and Museum",        description: "Fine arts, curation, aesthetics, preservation",      emoji: "🎨" },
  { value: "society",                label: "Society",                description: "Social structures, institutions, collective dynamics",emoji: "👥" },
  { value: "culture",                label: "Culture",                description: "Language, rituals, cultural shifts, subcultures",    emoji: "🎭" },
  { value: "biology",                label: "Biology",                description: "Evolutionary biology, soil health, neural systems",  emoji: "🌿" },
  { value: "science_and_technology", label: "Science and Tech",       description: "Research replication, forecasting, scientific models", emoji: "🔬" },
];

// ── Reading Aids ──────────────────────────────────────────────
export const CHUNK_SIZES: { value: 2 | 3; label: string; description: string }[] = [
  { value: 2, label: "2 words", description: "Focused chunks — better for denser text" },
  { value: 3, label: "3 words", description: "Wider chunks — faster pacing" },
];

export const FONT_SIZES: { value: 10 | 12 | 14 | 16; label: string }[] = [
  { value: 10, label: "10px" },
  { value: 12, label: "12px (CAT)" },
  { value: 14, label: "14px" },
  { value: 16, label: "16px" },
];

export const COL_WIDTHS: { value: ColWidth; label: string; description: string; maxWidth: string }[] = [
  { value: "narrow", label: "Narrow",  description: "~60ch — minimises line length, reduces saccades", maxWidth: "38rem" },
  { value: "medium", label: "Medium",  description: "~75ch — balanced for most reading speeds",         maxWidth: "52rem" },
  { value: "wide",   label: "Wide",    description: "~90ch — maximises visible words per line",          maxWidth: "65rem" },
];

// ── Passage Pool ──────────────────────────────────────────────
export const PASSAGE_WORD_MIN = 250;
export const PASSAGE_WORD_MAX = 350;
export const CALIBRATION_WORD_COUNT = 100;
export const PASSAGE_POOL_TARGET = 50; // per domain

// ── Session Phases ────────────────────────────────────────────
export const SESSION_PHASES = ["idle", "config", "reading", "mcq", "results"] as const;

// ── Question Types ────────────────────────────────────────────
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  main_idea: "Main Idea",
  inference: "Inference",
  vocab:     "Deep Inference",
};

// ── Comprehension Threshold ───────────────────────────────────
export const COMPREHENSION_PASS_THRESHOLD = 2; // out of 3
export const WEAK_DOMAIN_ACCURACY_THRESHOLD = 60; // percent

// ── Streaks ───────────────────────────────────────────────────
export const STREAK_MILESTONE = 7; // days — triggers celebration UI

// ── Adaptive Pacing ──────────────────────────────────────────────
/** WPM bump when recommending next session */
export const WPM_RECOMMENDATION_INCREMENT = 25;
