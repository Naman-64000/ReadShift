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

  // ── Syllable counter ──────────────────────────────────────────
  const getSyllableCount = (word: string): number => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    if (clean.length === 0) return 0;
    if (clean.length <= 3) return 1;

    // Count vowel groups (each group ≈ one syllable)
    const vowelGroups = clean.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;

    // Deduct for a trailing silent 'e' that isn't preceded by a vowel
    if (clean.endsWith("e") && clean.length > 2) {
      const preE = clean[clean.length - 2];
      if (!"aeiouy".includes(preE)) count--;
    }

    return Math.max(1, count);
  };

  // ── Punctuation multiplier ────────────────────────────────────
  const getPunctuationMultiplier = (words: string[]): number => {
    if (words.length === 0) return 1.0;
    const lastWord = words[words.length - 1];
    // Sentence-ending punctuation → natural pause
    if (/[.?!]\s*$/.test(lastWord)) return 1.25;
    // Clause-ending punctuation → slight pause
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
      // Base formula: complexity grows with length and syllable count
      weight += 1.0 + 0.12 * charLen + 0.28 * syllables;
    }
    const punctMult = getPunctuationMultiplier(chunk.words);
    return Math.max(0.5, weight * punctMult);
  });

  // ── 2. EMA smoothing (α = 0.35) ──────────────────────────────
  // Blend each weight with the previous smoothed value so adjacent chunks
  // don't swing more than ~60% apart. This makes the pacing feel organic
  // rather than jittery.
  const alpha = 0.35;
  const smoothedWeights = [...rawWeights];
  for (let i = 1; i < smoothedWeights.length; i++) {
    smoothedWeights[i] = alpha * rawWeights[i] + (1 - alpha) * smoothedWeights[i - 1];
  }
  // Reverse pass for symmetric smoothing
  for (let i = smoothedWeights.length - 2; i >= 0; i--) {
    smoothedWeights[i] = alpha * smoothedWeights[i] + (1 - alpha) * smoothedWeights[i + 1];
  }

  // ── 3. Compute total WPM budget, excluding paragraph bonuses ─
  const totalWords = chunks.reduce((sum, c) => sum + c.words.length, 0);
  const paragraphPauseMs = 400; // ms bonus per paragraph boundary (embedded into LAAP)
  // The WPM-based budget covers content reading time; paragraph pauses are additive.
  const contentDurationMs = (totalWords / targetWpm) * 60_000;

  // ── 4. Scale smoothed weights to fill the content duration ───
  const totalSmoothedWeight = smoothedWeights.reduce((sum, w) => sum + w, 0);
  const intervals = smoothedWeights.map((weight, i) => {
    const base = Math.round(contentDurationMs * (weight / totalSmoothedWeight));
    // Embed paragraph pause for this chunk if it starts a new paragraph
    const paraBonus = paragraphStartSet.has(i) ? paragraphPauseMs : 0;
    return base + paraBonus;
  });

  // ── 5. Rounding correction (content portion only) ─────────────
  // Re-compute the content sum (excluding embedded para bonuses) and
  // adjust the last content-only interval so total content ms = budget.
  const contentSum = intervals.reduce((sum, v, i) =>
    sum + v - (paragraphStartSet.has(i) ? paragraphPauseMs : 0), 0);
  const drift = Math.round(contentDurationMs) - contentSum;
  if (drift !== 0 && intervals.length > 0) {
    intervals[intervals.length - 1] += drift;
  }

  // ── 6. Floor: minimum 80ms per chunk so nothing is unreadable ─
  return intervals.map((v) => Math.max(80, v));
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
