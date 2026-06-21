import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { aiService } from "../services/aiService.js";
import { evaluatePassageQuality } from "../services/passageQualityService.js";

const TOPICS = [
  // 10 culture
  { domain: "culture", theme: "Cultural assimilation patterns and hybrid identity dynamics in diaspora communities." },
  { domain: "culture", theme: "The role of folklore, oral traditions, and myth-making in preserving subaltern histories." },
  { domain: "culture", theme: "Cultural hegemony and the systemic resistance of subcultural artistic expressions." },
  { domain: "culture", theme: "Foodways and the globalization or modification of traditional culinary heritages." },
  { domain: "culture", theme: "The semiotics of dress, fashion, and non-verbal resistance in post-colonial societies." },
  { domain: "culture", theme: "Urban geography, neighborhood gentrification, and the preservation of community culture." },
  { domain: "culture", theme: "Language death, minority dialects, and cognitive patterns preserved by endangered tongues." },
  { domain: "culture", theme: "Ritualistic practices, performance theories, and the social construction of sacred spaces." },
  { domain: "culture", theme: "Transnational media consumption and the shaping of local youth culture identities." },
  { domain: "culture", theme: "The institutionalization of high art versus the democratization of street art forms." },

  // 10 biology
  { domain: "biology", theme: "Epigenetic modifications, histone acetylation, and transgenerational stress responses." },
  { domain: "biology", theme: "Symbiotic mycorrhizal networks and subterranean biochemical defense signaling in forests." },
  { domain: "biology", theme: "Horizontal gene transfer in extreme prokaryotic communities and metabolic adaptability." },
  { domain: "biology", theme: "Synaptic pruning dynamics, neuroplastic remodeling, and default mode networks." },
  { domain: "biology", theme: "Phototransduction pathways, visual foveal mechanics, and predatory evolutionary pressures." },
  { domain: "biology", theme: "Epigenetic methylation cascades in avian migratory navigation and geomagnetism detection." },
  { domain: "biology", theme: "Mitochondrial DNA mutation rates, maternal inheritance, and evolutionary bottleneck modeling." },
  { domain: "biology", theme: "Biochemical pathways of extreme thermophile organisms in deep-sea volcanic chimneys." },
  { domain: "biology", theme: "Endosymbiotic theory and the metabolic integration of chloroplasts and mitochondria." },
  { domain: "biology", theme: "CRISPR-Cas9 off-target mechanisms and the search for high-fidelity prime editing protocols." },

  // 10 arts_and_museum
  { domain: "arts_and_museum", theme: "Curatorial strategies for representation and challenges of democratization in institutional art galleries." },
  { domain: "arts_and_museum", theme: "Deconstructive critiques of digital art authenticity, ownership, and copyright law." },
  { domain: "arts_and_museum", theme: "Ethical and political repatriation disputes of historical artifacts in national museums." },
  { domain: "arts_and_museum", theme: "The curating and preservation of transient, conceptual, or performance-based art exhibits." },
  { domain: "arts_and_museum", theme: "Spatial design, viewer experience, and structural politics of modern museum architecture." },
  { domain: "arts_and_museum", theme: "The commercialization of avant-garde protest art in mainstream gallery spaces." },
  { domain: "arts_and_museum", theme: "Phenomenological shifts and sensory accessibility in contemporary museum exhibition design." },
  { domain: "arts_and_museum", theme: "AI integration, metadata standards, and provenance tracking in large art collections." },
  { domain: "arts_and_museum", theme: "The historical role of patron networks and political agendas in shaping art museum collections." },
  { domain: "arts_and_museum", theme: "Viewer response theory and the negation of objective meaning in abstract expressionism art." }
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  console.log(`🚀 Seeding 30 Passages (10 culture, 10 biology, 10 arts_and_museum) with source 'gemini 4'...`);

  let seeded = 0;
  for (let i = 0; i < TOPICS.length; i++) {
    const item = TOPICS[i];
    console.log(`\n[Passage Seeding: ${i + 1}/30] Domain: "${item.domain}" | Focus: "${item.theme}"`);

    try {
      // De-duplication check: check if a passage with the same source and theme keyword exists
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
        console.log(`  ⏭️ Topic already seeded (Passage [${existing.id.slice(0, 8)}]). Skipping.`);
        seeded++;
        continue;
      }

      // 1. Generate Passage
      console.log(`  - Generating passage text...`);
      const passageData = await retryWithDelay(async () => {
        return await aiService.generatePassage(`${item.domain} (Focusing on ${item.theme})`);
      });

      passageData.domain = item.domain;
      passageData.body = passageData.body.trim();

      // 2. Generate questions
      console.log(`  - Generating questions...`);
      const questionsData = await retryWithDelay(async () => {
        return await aiService.generateQuestions(passageData.body);
      });

      // 3. Evaluate Quality
      const quality = await evaluatePassageQuality({
        body: passageData.body,
        word_count: passageData.word_count,
        questionCount: questionsData.length,
        source: "gemini",
        title: passageData.title,
      });

      // 4. Save Passage to DB
      const dbPassage = await prisma.passage.create({
        data: {
          body: passageData.body,
          word_count: passageData.word_count,
          domain: item.domain as any,
          generated_by: passageData.generated_by,
          source: "gemini 4",
          quality_score: quality.quality_score,
          title: quality.title,
          status: quality.status === "ready" ? "ready" : "draft",
          topic_key: quality.topic_key,
          paragraph_roadmaps: passageData.paragraph_roadmaps,
          date_added: new Date(),
        },
      });

      // 5. Save Questions to DB
      for (const q of questionsData) {
        await prisma.question.create({
          data: {
            passage_id: dbPassage.id,
            type: q.type as any,
            stem: q.stem,
            options: q.options as any,
            correct_index: q.correct_index,
            explanations: q.explanations,
          },
        });
      }

      console.log(`  ✅ Success! Saved passage [${dbPassage.id.slice(0, 8)}]`);
      seeded++;

    } catch (err: any) {
      console.error(`  ❌ Failed to generate passage for: "${item.theme}"`);
      console.error(`     Reason: ${err.message}`);
    }

    // Politeness delay
    await sleep(6000);
  }

  console.log(`\n🎉 Seed process complete! Successfully seeded ${seeded}/${TOPICS.length} passages.`);
}

main()
  .catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
