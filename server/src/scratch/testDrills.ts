// Standalone script to inspect drill pacing intervals

interface ReadingChunk {
  words: string[];
  paragraphIndex: number;
  isParagraphStart: boolean;
}

function wpmToIntervalMs(wpm: number, chunkSize: number): number {
  const chunksPerMinute = wpm / chunkSize;
  return Math.round((60 * 1000) / chunksPerMinute);
}

function calculateLaapIntervalsMs(
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
  const alpha = 0.35;
  const smoothedWeights = [...rawWeights];
  for (let i = 1; i < smoothedWeights.length; i++) {
    smoothedWeights[i] = alpha * rawWeights[i] + (1 - alpha) * smoothedWeights[i - 1];
  }
  for (let i = smoothedWeights.length - 2; i >= 0; i--) {
    smoothedWeights[i] = alpha * smoothedWeights[i] + (1 - alpha) * smoothedWeights[i + 1];
  }

  // ── 3. Compute total WPM budget ───────────────────────────
  const totalWords = chunks.reduce((sum, c) => sum + c.words.length, 0);
  const paragraphPauseMs = 400;
  const contentDurationMs = (totalWords / targetWpm) * 60_000;

  // ── 4. Scale smoothed weights ─────────────────────────────────
  const totalSmoothedWeight = smoothedWeights.reduce((sum, w) => sum + w, 0);
  const intervals = smoothedWeights.map((weight, i) => {
    const base = Math.round(contentDurationMs * (weight / totalSmoothedWeight));
    const paraBonus = paragraphStartSet.has(i) ? paragraphPauseMs : 0;
    return base + paraBonus;
  });

  // ── 5. Rounding correction ────────────────────────────────────
  const contentSum = intervals.reduce((sum, v, i) =>
    sum + v - (paragraphStartSet.has(i) ? paragraphPauseMs : 0), 0);
  const drift = Math.round(contentDurationMs) - contentSum;
  if (drift !== 0 && intervals.length > 0) {
    intervals[intervals.length - 1] += drift;
  }

  return intervals.map((v) => Math.max(80, v));
}

interface DrillChunk {
  words: string[];
}

function chunkText(text: string, size: number): DrillChunk[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: DrillChunk[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push({ words: words.slice(i, i + size) });
  }
  return chunks;
}

function buildLaapIntervals(chunks: DrillChunk[], targetWpm: number, chunkSize: number): number[] {
  if (chunks.length === 0) return [];
  const readingChunks = chunks.map((chunk, index) => ({
    words: chunk.words,
    paragraphIndex: 0,
    isParagraphStart: index === 0,
  }));
  const laapIntervals = calculateLaapIntervalsMs(readingChunks, targetWpm);
  return laapIntervals.length > 0 ? laapIntervals : chunks.map(() => wpmToIntervalMs(targetWpm, chunkSize));
}

const sampleText = "Environmental, Social, and Governance (ESG) investing faces systemic greenwashing challenges. In the absence of standardized reporting regulations, companies exploit flexible ESG metrics to construct favorable public narratives. This lack of transparency allows high-emissions firms to attract low-cost capital, distorting market allocations. To restore market efficiency, economists demand standardized, third-party audited carbon disclosure indices.";

const chunks = chunkText(sampleText, 2);
const intervals = buildLaapIntervals(chunks, 300, 2);

console.log("Chunks & Intervals:");
chunks.forEach((c, i) => {
  console.log(`Chunk ${i}: "${c.words.join(" ")}" -> ${intervals[i]}ms`);
});

const distinctIntervals = new Set(intervals);
console.log(`\nTotal chunks: ${chunks.length}`);
console.log(`Distinct intervals:`, Array.from(distinctIntervals));
