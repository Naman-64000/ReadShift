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
