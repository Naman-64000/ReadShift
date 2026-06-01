import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { aiService } from "../services/aiService.js";
import { evaluatePassageQuality } from "../services/passageQualityService.js";

const GEMINI3_TOPICS = [
  // 🧬 Science & Tech: 3 passages
  { domain: "science", theme: "Metabolic adjustments and metabolic depression in deep-sea hydrothermal vent organisms." },
  { domain: "science", theme: "Cognitive bottlenecks, phenomenological limits, and latency in human-AI neural co-processing." },
  { domain: "science", theme: "Epistemological implications and topological protection mechanisms in quantum error correction." },

  // 🧠 Society & Psych: 7 passages
  { domain: "social", theme: "Dual-process cognitive theories and decision fatigue under algorithmic choice architecture." },
  { domain: "social", theme: "The psychological dynamics of digital microtransactions and positive reinforcement schedules in gaming." },
  { domain: "social", theme: "Spatial segregation, panoptic design, and class stratification in modern hyper-monitored smart-city plans." },
  { domain: "social", theme: "The neuroplastic effects of short-form sensory stimulus and hyper-fragmented content feeds on executive function." },
  { domain: "social", theme: "The commodification of perceived authenticity and performative vulnerability in algorithmic creator ecosystems." },
  { domain: "social", theme: "Tribal polarization, cognitive dissonance, and identity protection in echo chamber network graphs." },
  { domain: "social", theme: "Cognitive deskilling and autonomy loss in highly automated, expert-system-reliant professional sectors." },

  // 🧭 Philosophy & Abstract: 9 passages
  { domain: "abstract", theme: "Deconstructive critiques of linguistic determinism, absolute semantic references, and signifier drifts." },
  { domain: "abstract", theme: "Moral agency, accountability voids, and value alignment paradigms in autonomous decision-making loops." },
  { domain: "abstract", theme: "Computational functionalism versus phenomenological perspectives on the 'hard problem' of qualia." },
  { domain: "abstract", theme: "Conceptual and ontological challenges to artistic authorship and originality in generative model outputs." },
  { domain: "abstract", theme: "Non-reductionist frameworks of default-permissible epistemic trust versus reductionist skepticism in modern media." },
  { domain: "abstract", theme: "Presentism versus eternalism in light of relativistic spacetime physics and psychological temporal flow." },
  { domain: "abstract", theme: "Structural critiques of meritocracy and the ethical limits of market-based allocations of civic goods." },
  { domain: "abstract", theme: "Realist versus instrumentalist interpretations of unobservable entities in quantum mechanics." },
  { domain: "abstract", theme: "The experience of technological alienation and the erosion of embodied presence in virtual environments." },

  // 📜 History & Culture: 12 passages
  { domain: "history", theme: "Historiographical debates surrounding the role of institutional property rights in pre-industrial agricultural output." },
  { domain: "history", theme: "The revisionist historiography of agricultural labor displacements during the English Enclosure acts." },
  { domain: "history", theme: "The long-term fiscal and developmental drag of mercantilist colonial extractions on post-independence local economies." },
  { domain: "history", theme: "Archaeological re-evaluations of complex, non-hierarchical, and egalitarian administrative power structures in early Anatolian cities." },
  { domain: "history", theme: "The transitions from architectural modernism’s functional purity to the irony and pastiche of post-modern urban layouts." },
  { domain: "history", theme: "Structural limitations and bureaucratic underfunding of the Freedmen's Bureau in post-Civil War civil rights enforcement." },
  { domain: "history", theme: "The administrative tensions and local bureaucratic bloat of the late Roman Tetrarchy system under Diocletian." },
  { domain: "history", theme: "The transmission and transformation of classical philosophical texts via the Islamic Golden Age translation movement." },
  { domain: "history", theme: "The socio-technical transitions from artisan guild systems to centralized factory disciplines in 18th-century Europe." },
  { domain: "history", theme: "The role of microclimatic shifts and agricultural failures in the collapse of Classic Maya lowland urban centers." },
  { domain: "history", theme: "The joint-stock revolution and risk-pooling mechanisms in early modern Dutch long-distance maritime trading networks." },
  { domain: "history", theme: "The political iconography and patronage networks of Renaissance court architectures in northern Italy." },

  // 📈 Business & Economics: 14 passages
  { domain: "business", theme: "Intertemporal choice anomalies, hyperbolic discounting, and predatory practices in consumer debt markets." },
  { domain: "business", theme: "Carbon leakage, regulatory arbitrage, and behavioral discounting in multi-jurisdictional carbon offset trading." },
  { domain: "business", theme: "Single-source vs multi-source supplier networks and vulnerability modeling under global logistical shocks." },
  { domain: "business", theme: "Information asymmetry and the structural expertise gap between corporate executives and generalist independent directors." },
  { domain: "business", theme: "Strategic entry deterrence and predatory pricing dynamics in digital platform economies." },
  { domain: "business", theme: "Patent thickets, cumulative innovation drag, and antitrust remedies in high-tech intellectual property." },
  { domain: "business", theme: "Adverse selection and market failure in contemporary decentralized peer-to-peer insurance pools." },
  { domain: "business", theme: "Common pool resource management and institutional designs for preventing tragedy of the commons in shared fisheries." },
  { domain: "business", theme: "The long-term impact of sovereign debt accumulation on domestic capital formation and productive investment." },
  { domain: "business", theme: "Monopsony power in localized labor markets and its structural depressing effect on real wage growth." },
  { domain: "business", theme: "Choice overload, default options, and decision fatigue in employee retirement savings contributions." },
  { domain: "business", theme: "Path dependency, core rigidities, and the innovator's dilemma in legacy manufacturing firms." },
  { domain: "business", theme: "Network externalities, two-sided market pricing, and winner-take-all consolidation dynamics in digital services." },
  { domain: "business", theme: "Unconventional monetary measures, quantitative easing, and their impact on wealth inequality via asset price inflation." }
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
  console.log(`🚀 Starting Gemini 3 Passage Seeding Run (Target: 45 passages, Batch 3)...`);

  let seeded = 0;
  for (let i = 0; i < GEMINI3_TOPICS.length; i++) {
    const item = GEMINI3_TOPICS[i];
    console.log(`\n[Gemini 3 Batch: ${i + 1}/45] Domain: "${item.domain}" | Topic: "${item.theme}"`);

    try {
      // De-duplication check matching against source "gemini 3"
      // To run a safe de-duplication check, we match unique key combinations
      const keywords = item.theme.split(" ").slice(0, 3).join(" ");
      const existing = await prisma.passage.findFirst({
        where: {
          source: "gemini 3",
          body: {
            contains: keywords,
            mode: "insensitive",
          },
        },
      });

      if (existing) {
        console.log(`  ⏭️ Topic already seeded in Batch 3 (Passage [${existing.id.slice(0, 8)}]). Skipping generation!`);
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

      // 3. Evaluate Quality using our strict new parameters
      // We pass source: "gemini" to utilize the model trust bonus
      const quality = evaluatePassageQuality({
        body: passageData.body,
        word_count: passageData.word_count,
        questionCount: questionsData.length,
        source: "gemini", 
      });

      // 4. Save Passage to PostgreSQL
      const dbPassage = await prisma.passage.create({
        data: {
          body: passageData.body,
          word_count: passageData.word_count,
          domain: item.domain as any,

          generated_by: "gemini-3.1-flash-lite (gemini 3)",
          source: "gemini 3",
          quality_score: quality.quality_score,
          status: quality.status === "ready" ? "ready" : "draft",
          topic_key: quality.topic_key,
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

    // Strict 6-second politeness buffer to avoid API rate limits
    await sleep(6000);
  }

  console.log(`\n🎉 Seed process finished! Successfully generated/found ${seeded}/45 passages for gemini 3.`);
}

main()
  .catch((err) => {
    console.error("❌ Fatal error in seed script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
