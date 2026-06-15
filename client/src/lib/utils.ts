/**
 * client/src/lib/utils.ts
 * General-purpose utility functions used across the ReadShift client.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { WPM_MIN, WPM_MAX, WPM_STEP } from "./constants";

// ── Tailwind class helper ─────────────────────────────────────
/** Merge Tailwind classes safely (handles conflicts like `p-2 p-4`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── WPM / Timer Math ─────────────────────────────────────────

/**
 * Convert WPM + chunk size to the interval between chunk advances (ms).
 * Formula: (chunkSize / wpm) * 60 * 1000
 * E.g. 300 WPM, 3-word chunks → advance every 600ms.
 */
export function wpmToIntervalMs(wpm: number, chunkSize: number): number {
  if (wpm <= 0 || chunkSize <= 0) return 1000;
  return Math.round((chunkSize / wpm) * 60 * 1000);
}

/**
 * Calculate actual WPM from word count and elapsed time in milliseconds.
 * Returns rounded integer.
 */
export function calculateActualWpm(wordCount: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.round((wordCount / elapsedMs) * 60 * 1000);
}

/**
 * Clamp a WPM value to the allowed range and snap to the nearest step.
 */
export function clampWpm(wpm: number): number {
  const clamped = Math.max(WPM_MIN, Math.min(WPM_MAX, wpm));
  return Math.round(clamped / WPM_STEP) * WPM_STEP;
}

// ── Passage Chunking ─────────────────────────────────────────

/**
 * Split a passage body into arrays of N words (chunks).
 * The last chunk may have fewer than chunkSize words.
 * Preserves original spacing/punctuation within each word token.
 */
export function chunkPassage(body: string, chunkSize: number): string[][] {
  const words = body.trim().split(/\s+/);
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize));
  }
  return chunks;
}

export interface ReadingChunk {
  words: string[];
  paragraphIndex: number;
  isParagraphStart: boolean;
}

/**
 * Split passage into chunks while preserving paragraph boundaries.
 */
export function chunkPassageWithParagraphs(body: string, chunkSize: number): ReadingChunk[] {
  const paragraphs = body
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: ReadingChunk[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push({
        words: words.slice(i, i + chunkSize),
        paragraphIndex,
        isParagraphStart: i === 0,
      });
    }
  });

  return chunks;
}

/**
 * Count words in a string (whitespace-split, filters empty strings).
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Time Formatting ───────────────────────────────────────────

/**
 * Format milliseconds as "m:ss" (e.g. 90000 → "1:30").
 */
export function msToTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format an ISO date string as a short human-readable date.
 * E.g. "2026-05-10T07:00:00Z" → "May 10"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format an ISO date string as a full date.
 * E.g. "2026-05-10T07:00:00Z" → "May 10, 2026"
 */
export function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ── Progress ──────────────────────────────────────────────────

/**
 * Calculate reading progress as a 0–100 percentage.
 */
export function readingProgress(currentChunkIndex: number, totalChunks: number): number {
  if (totalChunks === 0) return 0;
  return Math.min(100, Math.round((currentChunkIndex / totalChunks) * 100));
}

// ── Comprehension ─────────────────────────────────────────────

/**
 * Convert a 0–3 comprehension score to a 0–100 percentage.
 */
export function comprehensionToPercent(score: number): number {
  return Math.round((score / 3) * 100);
}

/**
 * Get a human-readable comprehension label.
 */
export function comprehensionLabel(score: number): string {
  if (score === 3) return "Perfect";
  if (score === 2) return "Good";
  if (score === 1) return "Fair";
  return "Needs Work";
}

// ── Domain ────────────────────────────────────────────────────

/**
 * Capitalise and format a domain key for display.
 */
export function formatDomain(domain: string): string {
  const labels: Record<string, string> = {
    business: "Business",
    science: "Science",
    history: "History",
    abstract: "Abstract",
    social: "Social Science",
  };
  return labels[domain] ?? domain;
}

// ── Misc ──────────────────────────────────────────────────────

/**
 * Generate a lightweight unique ID (not crypto-safe — for UI keys only).
 */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Sleep for N milliseconds (for testing / animations).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates a dynamically adjusted array of intervals (in milliseconds)
 * for each chunk using Linguistic-Aware Adaptive Pacing (LAAP).
 *
 * Algorithm:
 *  1. Compute a "cognitive weight" per chunk using character length, syllable
 *     count, and punctuation type (sentence endings trigger a 1.25× bonus).
 *  2. Apply EMA smoothing (α = 0.35) so consecutive intervals never swing
 *     more than ~60% apart, creating a natural reading rhythm.
 *  3. Natively embed paragraph-start pauses (+400ms per paragraph boundary)
 *     so LAAP and paragraph pausing co-exist without double-counting.
 *  4. Scale the smoothed weights so the total duration exactly matches the
 *     target WPM budget, guaranteeing actual WPM ≈ target WPM ±2%.
 *
 * @param chunks                    Array of passage chunks from chunkPassageWithParagraphs.
 * @param targetWpm                 Desired reading speed in words per minute.
 * @param paragraphStartIndices     Optional chunk indices that start a new paragraph.
 *                                  When provided, a 400ms pause bonus is embedded into
 *                                  those chunks so `extraDelayMsByNextChunk` is not needed.
 */
export function calculateLaapIntervalsMs(
  chunks: ReadingChunk[],
  targetWpm: number,
  paragraphStartIndices?: number[],
): number[] {
  if (chunks.length === 0 || targetWpm <= 0) return [];

  const paragraphStartSet = new Set(paragraphStartIndices ?? []);
  const EMA_ALPHA = 0.35;

  // ── Syllable counter ──────────────────────────────────────────
  const getSyllableCount = (word: string): number => {
    const trimmed = word.trim();
    if (!trimmed) return 0;

    // 1. Check if it contains digits (e.g. 2026, GPT-5)
    if (/\d/.test(trimmed)) {
      const digitCount = (trimmed.match(/\d/g) || []).length;
      const upperLetters = (trimmed.match(/[A-Z]/g) || []).length;
      return Math.max(1, Math.round(digitCount * 1.5) + upperLetters);
    }

    // 2. Check if it is an all-caps abbreviation (e.g. USA, AI)
    const isAllCaps = /^[A-Z.]{2,6}$/.test(trimmed.replace(/[^A-Za-z.]/g, ""));
    if (isAllCaps) {
      const lettersCount = trimmed.replace(/[^A-Z]/g, "").length;
      if (lettersCount >= 2) {
        return lettersCount;
      }
    }

    // 3. Check for symbol suffixes (e.g. C++, C#)
    let symbolSyllables = 0;
    if (trimmed.includes("++")) symbolSyllables += 2;
    else if (trimmed.includes("#")) symbolSyllables += 1;

    // 4. Standard alphabetic syllable estimation
    const clean = trimmed.toLowerCase().replace(/[^a-z]/g, "");
    if (clean.length === 0) return Math.max(1, symbolSyllables);
    if (clean.length <= 3) return Math.max(1, 1 + symbolSyllables);

    const vowelGroups = clean.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;

    if (clean.endsWith("e") && clean.length > 2) {
      const preE = clean[clean.length - 2];
      if (!"aeiouy".includes(preE)) count--;
    }

    return Math.max(1, count + symbolSyllables);
  };

  // ── Punctuation multiplier ────────────────────────────────────
  const getPunctuationMultiplier = (words: string[]): number => {
    if (words.length === 0) return 1.0;
    const lastWord = words[words.length - 1];
    if (/[?!]\s*$/.test(lastWord)) return 1.30;
    if (/\.\s*$/.test(lastWord)) return 1.20;
    if (/[,;:]\s*$/.test(lastWord)) return 1.10;
    return 1.0;
  };

  // ── 1. Raw cognitive weights ──────────────────────────────────
  const rawWeights = chunks.map((chunk) => {
    let weight = 0;
    for (const word of chunk.words) {
      const clean = word.trim();
      if (!clean) continue;
      const charLen = clean.length;
      const syllables = getSyllableCount(clean);
      weight += 1.0 + 0.08 * charLen + 0.35 * syllables;
    }
    const punctMult = getPunctuationMultiplier(chunk.words);
    return Math.max(0.5, weight * punctMult);
  });

  // ── 2. EMA smoothing (α = 0.35) ──────────────────────────────
  const smoothedWeights = [...rawWeights];
  for (let i = 1; i < smoothedWeights.length; i++) {
    smoothedWeights[i] = EMA_ALPHA * rawWeights[i] + (1 - EMA_ALPHA) * smoothedWeights[i - 1];
  }
  for (let i = smoothedWeights.length - 2; i >= 0; i--) {
    smoothedWeights[i] = EMA_ALPHA * smoothedWeights[i] + (1 - EMA_ALPHA) * smoothedWeights[i + 1];
  }

  // ── 3. Compute WPM budget and dynamic paragraph pause ─────────
  const totalWords = chunks.reduce((sum, c) => sum + c.words.length, 0);
  const contentDurationMs = (totalWords / targetWpm) * 60_000;
  const averageDuration = contentDurationMs / chunks.length;
  
  // Scale paragraph pause to reader speed, capped between 250ms and 700ms
  const paragraphPauseMs = Math.max(250, Math.min(700, Math.round(1.2 * averageDuration)));

  // ── 4. Scale and clamp base content intervals ─────────────────
  const totalSmoothedWeight = smoothedWeights.reduce((sum, w) => sum + w, 0);
  
  // Min limit: at least 80ms; Max limit: 2.2x the average duration
  const minLimit = Math.max(80, Math.round(0.45 * averageDuration));
  const maxLimit = Math.round(2.2 * averageDuration);

  const baseIntervals = smoothedWeights.map((weight) => {
    const base = Math.round(contentDurationMs * (weight / totalSmoothedWeight));
    return Math.max(minLimit, Math.min(maxLimit, base));
  });

  // ── 5. Rounding correction (content portion only) ─────────────
  const baseSum = baseIntervals.reduce((sum, v) => sum + v, 0);
  const drift = Math.round(contentDurationMs) - baseSum;
  if (drift !== 0 && baseIntervals.length > 0) {
    baseIntervals[baseIntervals.length - 1] = Math.max(minLimit, baseIntervals[baseIntervals.length - 1] + drift);
  }

  // ── 6. Assemble intervals with embedded paragraph bonuses ────
  return baseIntervals.map((base, i) => {
    const paraBonus = paragraphStartSet.has(i) ? paragraphPauseMs : 0;
    return base + paraBonus;
  });
}

export interface SkimmingParagraph {
  firstSentence: string;
  remainingText: string;
}

/**
 * Parses a passage body into paragraphs, separating the first sentence
 * from the rest of the text in each paragraph for structural skimming priming.
 */
export function parseParagraphsForSkimming(body: string): SkimmingParagraph[] {
  return body
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      // Find the first sentence ending index: . or ? or ! followed by space or end of string
      const match = p.match(/(.*?[\.\?\!])(\s|$)/);
      if (match) {
        const firstSentence = match[1].trim();
        const remainingText = p.slice(match[0].length).trim();
        return { firstSentence, remainingText };
      }
      // If no sentence-ending punctuation is found, treat the whole paragraph as the first sentence
      return { firstSentence: p, remainingText: "" };
    });
}

/**
 * Map user settings font size selection to the actual rendered font size in pixels.
 * Makes each size a little bigger for improved readability across all screens.
 */
export function getPassageFontSize(fontSizePx?: number): number {
  if (!fontSizePx) return 18; // Default to 18px
  if (fontSizePx === 10) return 14; // 10px -> 14px
  if (fontSizePx === 12) return 17; // 12px (CAT) -> 17px
  if (fontSizePx === 14) return 18; // 14px -> 18px
  if (fontSizePx === 16) return 20; // 16px -> 20px
  return fontSizePx + 2; // general offset
}
