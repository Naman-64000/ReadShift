/**
 * server/src/services/passageQualityService.ts
 * Centralized quality evaluation for generated/seeded passage bundles.
 */

const BANNED_LABEL_PATTERNS = [/^\s*\[passage\s*\d+\]/i, /^\s*passage\s*\d+\s*:/i];

export interface PassageQualityInput {
  body: string;
  word_count: number;
  questionCount: number;
  source: "seed" | "gemini" | "curated";
}

export interface PassageQualityResult {
  status: "ready" | "draft";
  quality_score: number;
  topic_key: string;
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

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function evaluatePassageQuality(input: PassageQualityInput): PassageQualityResult {
  const hasBannedLabel = BANNED_LABEL_PATTERNS.some((re) => re.test(input.body));
  const paragraphCount = input.body.split(/\n\s*\n/g).filter((p) => p.trim().length > 0).length;

  const wordScore = clampScore(((input.word_count - 350) / 250) * 100);
  const paragraphScore = paragraphCount >= 3 && paragraphCount <= 6 ? 100 : 70;
  const questionScore = input.questionCount === 3 ? 100 : 60;
  const labelPenalty = hasBannedLabel ? 35 : 0;

  const quality_score = clampScore(wordScore * 0.5 + paragraphScore * 0.25 + questionScore * 0.25 - labelPenalty);

  // Current rollout choice: pass all through as ready.
  // Later this can promote low-confidence content to draft for manual review.
  return {
    status: "ready",
    quality_score,
    topic_key: extractTopicKey(input.body),
  };
}
