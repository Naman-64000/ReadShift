/**
 * server/src/services/passageQualityService.ts
 * Centralized quality evaluation for generated/seeded passage bundles.
 *
 * Scoring dimensions (0-100 each):
 *  - Word count  (45%) — ideal 420-620 words; linearly decays below/above
 *  - Paragraphs  (30%) — ideal 3-7 paragraphs; hard penalty for < 3 (wall-of-text)
 *  - Questions   (25%) — must have exactly 3; hard fail if not
 *  - Source trust bonus: +5 for gemini/curated, 0 for static_vault, -5 for seed
 *  - Banned label penalty: -40 if "[Passage N]" or "Passage N:" prefix found
 *
 * Threshold: ≥ 70 → "ready", < 70 → "draft" (held for manual review)
 */

const BANNED_LABEL_PATTERNS = [/^\s*\[passage\s*\d+\]/i, /^\s*passage\s*\d+\s*:/i];

export interface PassageQualityInput {
  body: string;
  word_count: number;
  questionCount: number;
  source: "seed" | "gemini" | "curated" | "static_vault" | string;
}

export interface PassageQualityResult {
  status: "ready" | "draft";
  quality_score: number;
  topic_key: string;
  title: string;
}

function extractTopicKey(body: string): string {
  return body
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join("-");
}

export function buildPassageTitle(topicKey: string | null | undefined): string {
  const fallback = "Academic Reading Passage";
  if (!topicKey) return fallback;

  const title = topicKey
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return title || fallback;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Word count score based on strict arithmetic ranges (diff of 20):
 *  - 420-440 words: 60 points
 *  - 441-460 words: 65 points
 *  - 461-480 words: 70 points
 *  - 481-500 words: 75 points
 *  - 501-520 words: 80 points
 *  - 521-540 words: 85 points
 *  - 541-560 words: 90 points
 *  - 561-580 words: 95 points
 *  - 581-600 words: 97 points
 *  - 601-620 words: 100 points (ideal threshold)
 *  - Outside 420-620 words: 0 points (invalid GMAT length)
 */
function wordCountScore(wordCount: number): number {
  if (wordCount < 420 || wordCount > 620) return 0;
  if (wordCount >= 420 && wordCount <= 440) return 60;
  if (wordCount > 440 && wordCount <= 460) return 65;
  if (wordCount > 460 && wordCount <= 480) return 70;
  if (wordCount > 480 && wordCount <= 500) return 75;
  if (wordCount > 500 && wordCount <= 520) return 80;
  if (wordCount > 520 && wordCount <= 540) return 85;
  if (wordCount > 540 && wordCount <= 560) return 90;
  if (wordCount > 560 && wordCount <= 580) return 95;
  if (wordCount > 580 && wordCount <= 600) return 97;
  if (wordCount > 600 && wordCount <= 620) return 100;
  return 0;
}

/**
 * Paragraph structure score.
 * Must be strictly 3, 4, 5, or 6 paragraphs.
 * 3-6 paragraphs = 100 (ideal skimmability)
 * Anything else (1, 2, or 7+) = 0 (strictly failed structure)
 */
function paragraphScore(body: string): number {
  const count = body.split(/\n\s*\n/g).filter((p) => p.trim().length > 10).length;
  if (count >= 3 && count <= 6) return 100;
  return 0;
}

/**
 * Question count score — must have exactly 3 questions (main_idea, inference, vocab).
 * This is a hard requirement; wrong count is a quality failure.
 */
function questionScore(count: number): number {
  if (count === 3) return 100;
  if (count === 2) return 30; // partial — still usable with caution
  return 0; // 0, 1, or 4+ questions is a hard failure
}

/**
 * Source trust bonus (additive, not a multiplier).
 * AI-generated passages from known-good models get a small credibility boost.
 */
function sourceTrustBonus(source: string): number {
  if (source === "gemini" || source === "curated") return 5;
  if (source === "static_vault") return 0;
  if (source === "seed") return -5;
  return 0;
}

export function evaluatePassageQuality(input: PassageQualityInput): PassageQualityResult {
  const hasBannedLabel = BANNED_LABEL_PATTERNS.some((re) => re.test(input.body));
  const labelPenalty = hasBannedLabel ? 40 : 0;

  const wScore = wordCountScore(input.word_count);
  const pScore = paragraphScore(input.body);
  const qScore = questionScore(input.questionCount);
  const bonus = sourceTrustBonus(input.source);

  const quality_score = clampScore(
    wScore * 0.45 + pScore * 0.30 + qScore * 0.25 + bonus - labelPenalty
  );

  return {
    status: quality_score >= 70 ? "ready" : "draft",
    quality_score,
    topic_key: extractTopicKey(input.body),
    title: buildPassageTitle(extractTopicKey(input.body)),
  };
}
