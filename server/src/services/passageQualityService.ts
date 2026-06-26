/**
 * server/src/services/passageQualityService.ts
 * Centralized quality evaluation for generated/seeded passage bundles.
 *
 * Scoring dimensions:
 *  - FORMAT SCORE (30 pts max)
 *     - Word count  (10 pts)
 *     - Paragraphs  (10 pts)
 *     - Questions   (10 pts)
 *  - CONTENT SCORE (70 pts max)
 *     - Concept Density     (15 pts) - Transitional & conceptual contrast markers
 *     - Argument Structure  (15 pts) - Claims, counterclaims, qualifications, rebuttals
 *     - Author Nuance       (10 pts) - Qualifiers, hedges, uncertainty signals
 *     - Inference Potential (10 pts) - LLM Evaluator (density of GMAT inference patterns)
 *     - Naturalness         (10 pts) - LLM Evaluator (scholarly journal vs robotic AI text)
 *     - Structural Variety  (5 pts)  - Automated check for starting paragraph diversity
 *     - Title Quality       (5 pts)  - LLM Evaluator (creative academic vs generic headers)
 *
 * Status Threshold:
 *  - Score >= 60 -> "ready" (80+ Excellent, 70-79 Strong, 60-69 Acceptable)
 *  - Score < 60  -> "draft" (50-59 Review, <50 Draft)
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const BANNED_LABEL_PATTERNS = [/^\s*\[passage\s*\d+\]/i, /^\s*passage\s*\d+\s*:/i];

export interface PassageQualityInput {
  body: string;
  word_count: number;
  questionCount: number;
  source: string;
  title?: string;
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

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

export function calculateFleschKincaid(text: string): number {
  const words = text.match(/\b\w+\b/g) || [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (words.length === 0 || sentences.length === 0) return 0;
  
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
  const score = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
  return Math.round(score * 10) / 10;
}

// ── HEURISTICS MARKERS ────────────────────────────────────────────────────────

const CONCEPT_DENSITY_MARKERS = [
  /\bhowever\b/gi, /\balthough\b/gi, /\byet\b/gi, /\brather\s+than\b/gi,
  /\bdespite\b/gi, /\bwhereas\b/gi, /\bwhile\b/gi, /\binstead\b/gi,
  /\bnevertheless\b/gi, /\bassumption(s)?\b/gi, /\bframework(s)?\b/gi,
  /\binterpretation(s)?\b/gi, /\bevidence\b/gi, /\bmethodology\b/gi,
  /\bparadox(es)?\b/gi
];

const ARGUMENT_STRUCTURE_MARKERS = [
  /\bclaim(s)?\b/gi, /\bcounterclaim(s)?\b/gi, /\bqualification(s)?\b/gi,
  /\bevidence\b/gi, /\brebuttal(s)?\b/gi
];

const NUANCE_MARKERS = [
  /\bmay\b/gi, /\bmight\b/gi, /\bappear(s)?\b/gi, /\bsuggest(s)?\b/gi,
  /\barguably\b/gi, /\bpartially\b/gi, /\balthough\b/gi, /\bwhile\b/gi
];

// ── FORMAT SCORING HELPERS ───────────────────────────────────────────────────

function wordCountScore(wordCount: number): number {
  if (wordCount < 400 || wordCount > 620) return 0;
  if (wordCount >= 560 && wordCount <= 620) return 10;
  if (wordCount >= 520 && wordCount < 560) return 8;
  if (wordCount >= 480 && wordCount < 520) return 6;
  if (wordCount >= 460 && wordCount < 480) return 4;
  return 2; // Under 460 but over 400
}

function paragraphScore(body: string): number {
  const count = body.split(/\n\s*\n/g).filter((p) => p.trim().length > 10).length;
  if (count >= 3 && count <= 6) return 10;
  return 0;
}

function questionScore(count: number): number {
  if (count === 3) return 10;
  if (count === 2) return 3;
  return 0;
}

// ── LLM EVALUATOR CALL ────────────────────────────────────────────────────────

async function evaluatePassageWithAI(
  body: string,
  title: string,
  userCustomApiKey?: string | null
): Promise<{ inference_potential: number; naturalness: number; title_quality: number; readability_complexity: number }> {
  const apiKey = userCustomApiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("⚠️ No GEMINI_API_KEY found, returning default content scores (7/10)");
    return { inference_potential: 7, naturalness: 7, title_quality: 7, readability_complexity: 7 };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        temperature: 0.0, // Strict, deterministic scoring
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            inference_potential: { type: SchemaType.NUMBER },
            naturalness: { type: SchemaType.NUMBER },
            title_quality: { type: SchemaType.NUMBER },
            readability_complexity: { type: SchemaType.NUMBER },
          },
          required: ["inference_potential", "naturalness", "title_quality", "readability_complexity"],
        } as any,
      },
    });

    const prompt = `
        You are an expert reading comprehension test auditor. Evaluate the following passage and its title based on the criteria below.
        
        Passage:
        ${body}
        
        Title:
        ${title}
        
        Evaluate and score the following four dimensions from 0 to 10 (accept floats or ints, e.g., 8.5 or 8):
        1. "inference_potential" (0-10): How many strong GMAT/CAT-style inference, assumption, author attitude, and paragraph role questions could naturally be created from this passage? High score means the passage is dense with implicit assumptions and logical pivots.
        2. "naturalness" (0-10): Does this passage read like a real, professionally written magazine or scholarly journal article (e.g. Economist, Scientific American) as opposed to sounding like dry, robotic, or formulaic AI-generated text?
        3. "title_quality" (0-10): Is the title creative, academically credible, specific, and organic (e.g., "When Evidence Outlives Theory") rather than templated or generic (e.g., "The Debate Over Memory", "Rethinking X")?
        4. "readability_complexity" (0-10): How appropriately complex is the vocabulary and syntax for a university-level reader aiming for high WPM difficulty? (10 is very appropriately dense and complex, 0 is overly simplistic).
        
        Output the scores in the required JSON format.
    `;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as {
      inference_potential: number;
      naturalness: number;
      title_quality: number;
      readability_complexity: number;
    };

    return {
      inference_potential: Math.max(0, Math.min(10, parsed.inference_potential || 7)),
      naturalness: Math.max(0, Math.min(10, parsed.naturalness || 7)),
      title_quality: Math.max(0, Math.min(10, parsed.title_quality || 7)),
      readability_complexity: Math.max(0, Math.min(10, parsed.readability_complexity || 7)),
    };
  } catch (err: any) {
    console.warn(`⚠️ Gemini quality evaluation call failed: ${err.message}. Defaulting to scores (7/10)`);
    return { inference_potential: 7, naturalness: 7, title_quality: 7, readability_complexity: 7 };
  }
}

// ── CORE QUALITY EVALUATION ───────────────────────────────────────────────────

export async function evaluatePassageQuality(
  input: PassageQualityInput,
  userCustomApiKey?: string | null
): Promise<PassageQualityResult> {
  const topic_key = extractTopicKey(input.body);
  const title = input.title || buildPassageTitle(topic_key);

  const hasBannedLabel = BANNED_LABEL_PATTERNS.some((re) => re.test(input.body));
  const labelPenalty = hasBannedLabel ? 40 : 0;

  // 1. Format Score (Max 30)
  const fWord = wordCountScore(input.word_count);
  const fPara = paragraphScore(input.body);
  const fQuestion = questionScore(input.questionCount);
  const formatScore = fWord + fPara + fQuestion;

  // 2. Content Heuristics (Max 45)
  // 2.1 Concept Density (Max 15)
  let conceptCount = 0;
  for (const regex of CONCEPT_DENSITY_MARKERS) {
    const matches = input.body.match(regex);
    if (matches) conceptCount += matches.length;
  }
  const conceptScore = Math.min(15, conceptCount * 1.5);

  // 2.2 Argument Structure (Max 15)
  let argCount = 0;
  for (const regex of ARGUMENT_STRUCTURE_MARKERS) {
    const matches = input.body.match(regex);
    if (matches) argCount += matches.length;
  }
  const argScore = Math.min(15, argCount * 3.0);

  // 2.3 Author Nuance (Max 10)
  let nuanceCount = 0;
  for (const regex of NUANCE_MARKERS) {
    const matches = input.body.match(regex);
    if (matches) nuanceCount += matches.length;
  }
  const nuanceScore = Math.min(10, nuanceCount * 1.5);

  // 2.4 Structural Variety (Max 5)
  const paragraphs = input.body.split(/\n\s*\n/g).filter((p) => p.trim().length > 10);
  let varietyScore = 5;
  const genericWords = ["the", "a", "an", "this", "it", "these", "there"];
  const startingWords = new Set<string>();

  for (const p of paragraphs) {
    const cleanText = p.trim().replace(/[^a-zA-Z\s]/g, "");
    const firstWord = cleanText.split(/\s+/)[0]?.toLowerCase();
    if (firstWord) {
      if (genericWords.includes(firstWord)) {
        varietyScore -= 1.0;
      }
      if (startingWords.has(firstWord)) {
        varietyScore -= 1.5;
      }
      startingWords.add(firstWord);
    }
  }
  varietyScore = Math.max(0, varietyScore);

  // 3. LLM Evaluated Content Metrics (Max 25 out of 40 scaled)
  // LLM scores sum to 40. We scale the 40-point LLM total to a maximum of 25 points.
  const aiScores = await evaluatePassageWithAI(input.body, title, userCustomApiKey);
  const rawAISum = aiScores.inference_potential + aiScores.naturalness + aiScores.title_quality + aiScores.readability_complexity;
  const aiScoreScaled = (rawAISum / 40) * 25;

  // 4. Source Trust Bonus / Penalty
  let trustBonus = 0;
  if (input.source === "gemini" || input.source === "curated") {
    trustBonus = 5;
  } else if (input.source === "seed") {
    trustBonus = -5;
  }
  
  // 5. Readability Penalty (Flesch-Kincaid Grade Level)
  const fkGrade = calculateFleschKincaid(input.body);
  const readabilityPenalty = fkGrade < 12 ? Math.round((12 - fkGrade) * 5) : 0;

  // Calculate final score out of 100
  const finalScore = Math.max(0, Math.min(100, Math.round(
    formatScore + conceptScore + argScore + nuanceScore + varietyScore + aiScoreScaled + trustBonus - labelPenalty - readabilityPenalty
  )));

  // Scores < 50 go to draft as requested by the user, status >= 60 is ready.
  // Note: passages between 50 and 59 are held for review (draft status) too.
  // So status ready requires score >= 60.
  const status = finalScore >= 60 ? "ready" : "draft";

  return {
    status,
    quality_score: finalScore,
    topic_key,
    title,
  };
}
