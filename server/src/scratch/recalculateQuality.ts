import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { evaluatePassageQuality } from "../services/passageQualityService.js";

async function main() {
  console.log("🚀 Starting database passage quality recalculation...");

  const passages = await prisma.passage.findMany({
    include: {
      questions: true,
    },
  });

  console.log(`Found ${passages.length} passages to process.`);

  let updatedCount = 0;
  for (const p of passages) {
    const prevScore = p.quality_score;
    const prevStatus = p.status;

    // Run the new quality check
    const quality = evaluatePassageQuality({
      body: p.body,
      word_count: p.word_count,
      questionCount: p.questions.length,
      source: p.source,
    });

    // Update the database
    // Note: status is ready or draft depending on quality check score >= 70
    await prisma.passage.update({
      where: { id: p.id },
      data: {
        quality_score: quality.quality_score,
        status: quality.status === "ready" ? "ready" : "draft",
        title: quality.title,
        topic_key: quality.topic_key,
      },
    });

    console.log(`Passage [${p.id.slice(0, 8)}] (${p.domain}):`);
    console.log(`  - Word Count: ${p.word_count}`);
    console.log(`  - Paragraphs: ${p.body.split(/\n\s*\n/g).filter((para) => para.trim().length > 10).length}`);
    console.log(`  - Score: ${prevScore} ➔ ${quality.quality_score}`);
    console.log(`  - Status: ${prevStatus} ➔ ${quality.status === "ready" ? "ready" : "draft"}`);
    
    updatedCount++;
  }

  console.log(`\n✅ Done! Successfully updated ${updatedCount} passages in the database.`);
}

main()
  .catch((err) => {
    console.error("❌ Fatal error during recalculation:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
