import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { aiService } from "../services/aiService.js";
import { evaluatePassageQuality } from "../services/passageQualityService.js";

const CAT_TOPICS = [
  { domain: "science", level: 3, theme: "Evolutionary adaptations and metabolic adjustments in deep-sea hydrothermal ecosystems." },
  { domain: "science", level: 4, theme: "Cognitive limits and phenomenological bottlenecks in human-AI neural interfaces." },
  { domain: "history", level: 3, theme: "The historiographical revision of the Industrial Revolution's impact on agrarian labor classes." },
  { domain: "social", level: 4, theme: "Dual-process theories and cognitive biases in modern hyper-stimulated digital environments." },
  { domain: "abstract", level: 3, theme: "Phenomenological perceptions of time, memory, and qualitative consciousness." },
  { domain: "business", level: 4, theme: "Game-theoretic equilibria and cognitive anomalies in digital microtransaction markets." },
  { domain: "social", level: 3, theme: "The cultural commodification of authenticity in modern social media." },
  { domain: "science", level: 4, theme: "Altruism, kinship selection, and evolutionary game theory in social insect colonies." },
  { domain: "abstract", level: 3, theme: "Deconstructive critiques of linguistic absolute meaning and semantic instability." },
  { domain: "science", level: 4, theme: "Epistemological shifts and relational paradigms in quantum entanglement theories." },
  { domain: "history", level: 3, theme: "The transition from modernism to post-modern pastiche in urban architecture." },
  { domain: "social", level: 4, theme: "The neuroplastic effects of short-form sensory stimulus on attentional networks." },
  { domain: "business", level: 3, theme: "Market failures, carbon leakage, and behavioral discounting in carbon offset trading." },
  { domain: "social", level: 4, theme: "Spatial segregations and class stratification in modern smart-city architectures." },
  { domain: "abstract", level: 3, theme: "Ethical paradoxes and moral agency in autonomous decision-making algorithms." },
  { domain: "history", level: 4, theme: "The historiography of mercantilism and its post-colonial socio-economic drag." },
  { domain: "science", level: 3, theme: "Feedback loops and environmental resilience metrics in anthropocene climate models." },
  { domain: "social", level: 4, theme: "Cognitive dissonance and tribal polarization in online networks." },
  { domain: "science", level: 3, theme: "Paradigm shifts in epigenetics, transgenerational inheritance, and non-Darwinian mechanisms." },
  { domain: "abstract", level: 4, theme: "Conceptual critiques of algorithmic generative art and authorship paradigms." },
  { domain: "business", level: 3, theme: "Intertemporal choices, hyperbolic discounting, and cognitive biases in consumer debt." },
  { domain: "history", level: 4, theme: "Archaeological re-evaluations of egalitarian power structures in early agrarian societies." },
  { domain: "science", level: 3, theme: "Visual foveal processing, intelligence, and hunting mechanics in cephalopods." },
  { domain: "social", level: 4, theme: "The panoptic surveillance state, privacy degradation, and metadata monetization." },
  { domain: "abstract", level: 3, theme: "Computational functionalism versus the hard problem of qualitative consciousness." },
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Robust retry wrapper for Gemini AI API calls
async function retryWithDelay<T>(fn: () => Promise<T>, retries = 3, delay = 6000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= retries) throw err;
      console.warn(`    ⚠️ AI call failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms... Error: ${err.message.split('\n')[0]}`);
      await sleep(delay);
    }
  }
}

async function main() {
  console.log("🚀 Starting GMAT/CAT Elite Passage Generation (25 passages, Batch 2) using gemini-3.1-flash-lite...");

  let seeded = 0;
  for (let i = 0; i < CAT_TOPICS.length; i++) {
    const item = CAT_TOPICS[i];
    console.log(`\n[CAT Seed Batch 2: ${i + 1}/25] Topic: "${item.theme}"`);
    console.log(`  - Domain: ${item.domain}, Level: ${item.level}`);

    try {
      // Get unique keywords to look up existing passages in the database and avoid duplicates specifically for gemini 2 batch
      const keywords = item.theme.split(" ").slice(0, 3).join(" ");
      const existing = await prisma.passage.findFirst({
        where: {
          source: "gemini 2",
          body: {
            contains: keywords,
            mode: "insensitive",
          },
        },
      });

      if (existing) {
        console.log(`  ⏭️ Topic already seeded in Batch 2 (Passage [${existing.id.slice(0, 8)}]). Skipping generation!`);
        seeded++;
        continue;
      }

      // 1. Generate Passage with retries
      console.log(`  - Generating passage text (Reasoning Density focus)...`);
      const passageData = await retryWithDelay(async () => {
        return await aiService.generatePassage(`${item.domain} (Focusing on ${item.theme})`);
      });
      
      passageData.domain = item.domain;
      passageData.body = passageData.body.trim();

      // 2. Generate questions with retries
      console.log(`  - Generating GMAT/CAT structured MCQs (with close distractors)...`);
      const questionsData = await retryWithDelay(async () => {
        return await aiService.generateQuestions(passageData.body);
      });

      // 3. Evaluate Quality using our strict new parameters
      const quality = evaluatePassageQuality({
        body: passageData.body,
        word_count: passageData.word_count,
        questionCount: questionsData.length,
        source: "gemini", // evaluate with active trust bonus
      });

      // 4. Save Passage to PostgreSQL
      const dbPassage = await prisma.passage.create({
        data: {
          body: passageData.body,
          word_count: passageData.word_count,
          domain: item.domain as any,

          generated_by: "gemini-3.1-flash-lite (gemini 2)",
          source: "gemini 2",
          quality_score: quality.quality_score,
          title: quality.title,
          status: quality.status === "ready" ? "ready" : "draft",
          topic_key: quality.topic_key,
          paragraph_roadmaps: passageData.paragraph_roadmaps,
        },
      });

      // 5. Save matching Questions to PostgreSQL
      for (const q of questionsData) {
        await prisma.question.create({
          data: {
            passage_id: dbPassage.id,
            type: q.type as any,
            stem: q.stem,
            options: q.options,
            correct_index: q.correct_index,
            explanations: q.explanations,
          },
        });
      }

      console.log(`  ✅ Success! Saved passage [${dbPassage.id.slice(0, 8)}]`);
      console.log(`     - Word count: ${dbPassage.word_count}`);
      console.log(`     - Paragraph count: ${dbPassage.body.split(/\n\s*\n/g).filter(Boolean).length}`);
      console.log(`     - Quality score: ${dbPassage.quality_score} (${dbPassage.status})`);
      seeded++;

    } catch (err: any) {
      console.error(`  ❌ Failed to generate passage for theme: "${item.theme}"`);
      console.error(`     Reason: ${err.message}`);
    }

    // Politeness buffer to prevent rate limit limits
    await sleep(6000);
  }

  console.log(`\n🎉 Seed process finished! Successfully generated/found ${seeded}/25 passages for gemini 2.`);
}

main()
  .catch((err) => {
    console.error("❌ Fatal error in seed script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
