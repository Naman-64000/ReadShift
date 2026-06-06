import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { aiService } from "../services/aiService.js";
import { evaluatePassageQuality } from "../services/passageQualityService.js";

const GEMINI4_TOPICS = [
  // 🧭 Abstract: 5 passages
  { domain: "abstract", theme: "The epistemological conflict between structuralism and post-structuralist deconstructionism in literary theory." },
  { domain: "abstract", theme: "The ontological status of mathematical objects: realism versus fictionalism and nominalism." },
  { domain: "abstract", theme: "The hard problem of consciousness: comparing materialist functionalism and panpsychist explanations of qualia." },
  { domain: "abstract", theme: "The limits of deontological ethics when confronted with decision-theoretic aggregative moral dilemmas." },
  { domain: "abstract", theme: "The nature of scientific representation: semantic realism versus pragmatic instrumentalism in quantum models." },

  // 🧠 Social: 6 passages
  { domain: "social", theme: "The socio-economic implications of algorithmic credit scoring systems on systemic stratification." },
  { domain: "social", theme: "The impact of micro-targeted digital campaign advertising on political polarization and cognitive echo chambers." },
  { domain: "social", theme: "The psychological and structural dynamics of gamification and intermittent variable reward systems in educational platforms." },
  { domain: "social", theme: "Autonomy and cognitive deskilling in professional environments dominated by diagnostic artificial intelligence." },
  { domain: "social", theme: "The shift from industrial panoptic surveillance to decentralized digital governance and data commodification." },
  { domain: "social", theme: "The neurobiology and social dynamics of attention depletion in short-form digital media ecosystems." },

  // 🧬 Science: 11 passages
  { domain: "science", theme: "Topological insulation and error correction paradigms in superconducting quantum computing architectures." },
  { domain: "science", theme: "Metabolic adjustments, nutrient pathways, and anaerobic mechanisms of extremophile deep-sea hydrothermal vent organisms." },
  { domain: "science", theme: "Epigenetic methylation changes in response to early-life environmental stressors and transgenerational inheritance." },
  { domain: "science", theme: "The transition from classical dark matter paradigms to modified Newtonian dynamics (MOND) in galactic rotation curves." },
  { domain: "science", theme: "CRISPR-Cas9 off-target mutation risks and the development of high-fidelity prime editing protocols." },
  { domain: "science", theme: "The role of RNA interference (RNAi) pathways in post-transcriptional gene silencing and viral defense." },
  { domain: "science", theme: "Prebiotic chemistry, thermal gradients, and hydrothermal vents in the emergence of primordial self-replicating vesicles." },
  { domain: "science", theme: "The neurobiology of synaptic pruning and default mode network remodeling during adolescent brain development." },
  { domain: "science", theme: "Phytoplankton carbon sequestration efficiency, biological pumps, and iron-fertilization anomalies in Southern oceans." },
  { domain: "science", theme: "The ecological dynamics of mycorrhizal networks in temperate forest soils and subterranean nutrient exchange." },
  { domain: "science", theme: "Quantum coherence preservation mechanisms in biological photosynthetic complexes under ambient temperatures." },

  // 📈 Business: 1 passage
  { domain: "business", theme: "Asymmetric information, moral hazard, and adverse selection in decentralized finance (DeFi) liquidity pools." },

  // 📜 History: 2 passages (making up exactly 25 passages in total)
  { domain: "history", theme: "Revisionist historiography regarding the role of demographic shifts and labor scarcity in the collapse of the feudal economy after the Black Death." },
  { domain: "history", theme: "The administrative tensions, economic impacts, and structural decentralization under the late Roman Tetrarchy system." }
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
  console.log(`🚀 Starting Gemini 4 Passage Seeding Run (Target: 25 passages)...`);

  let seeded = 0;
  for (let i = 0; i < GEMINI4_TOPICS.length; i++) {
    const item = GEMINI4_TOPICS[i];
    console.log(`\n[Gemini 4 Batch: ${i + 1}/25] Domain: "${item.domain}" | Theme: "${item.theme}"`);

    try {
      // De-duplication check matching against source "gemini 4"
      const keywords = item.theme.split(" ").slice(0, 3).join(" ");
      const existing = await prisma.passage.findFirst({
        where: {
          source: "gemini 4",
          body: {
            contains: keywords,
            mode: "insensitive",
          },
        },
      });

      if (existing) {
        console.log(`  ⏭️ Topic already seeded in Batch (Passage [${existing.id.slice(0, 8)}]). Skipping generation!`);
        seeded++;
        continue;
      }

      // 1. Generate Passage
      console.log(`  - Generating passage text (Reasoning Density focus)...`);
      const passageData = await retryWithDelay(async () => {
        return await aiService.generatePassage(`${item.domain} (Focusing on ${item.theme})`);
      });
      
      passageData.domain = item.domain;
      passageData.body = passageData.body.trim();

      // 2. Generate questions
      console.log(`  - Generating GMAT/CAT structured MCQs (with close distractors)...`);
      const questionsData = await retryWithDelay(async () => {
        return await aiService.generateQuestions(passageData.body);
      });

      // 3. Evaluate Quality using our strict parameters
      // We pass source: "gemini" to utilize the model trust bonus
      const quality = await evaluatePassageQuality({
        body: passageData.body,
        word_count: passageData.word_count,
        questionCount: questionsData.length,
        source: "gemini", 
        title: passageData.title,
      });

      // 4. Save Passage to PostgreSQL
      const dbPassage = await prisma.passage.create({
        data: {
          body: passageData.body,
          word_count: passageData.word_count,
          domain: item.domain as any,
          generated_by: "gemini-3.1-flash-lite (gemini 4)",
          source: "gemini 4",
          quality_score: quality.quality_score,
          title: quality.title,
          status: quality.status === "ready" ? "ready" : "draft",
          topic_key: quality.topic_key,
          paragraph_roadmaps: passageData.paragraph_roadmaps,
          skim_highlights: passageData.skim_highlights,
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
      console.log(`     - Title: "${dbPassage.title}"`);
      console.log(`     - Word count: ${dbPassage.word_count}`);
      console.log(`     - Paragraph count: ${dbPassage.body.split(/\n\s*\n/g).filter(Boolean).length}`);
      console.log(`     - Quality score: ${dbPassage.quality_score} (${dbPassage.status})`);
      seeded++;

    } catch (err: any) {
      console.error(`  ❌ Failed to generate passage for theme: "${item.theme}"`);
      console.error(`     Reason: ${err.message}`);
    }

    // Strict 6-second politeness buffer to avoid API rate limits
    await sleep(6000);
  }

  console.log(`\n🎉 Seed process finished! Successfully generated/found ${seeded}/25 passages for gemini 4.`);
}

main()
  .catch((err) => {
    console.error("❌ Fatal error in seed script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
