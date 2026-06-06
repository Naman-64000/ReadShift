import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { evaluatePassageQuality } from "../services/passageQualityService.js";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Starting quality score recalculation for 'gemini 2' passages...");

  // Fetch passages belonging to gemini 2
  const passages = await prisma.passage.findMany({
    where: {
      source: "gemini 2",
    },
    include: {
      questions: true,
    },
  });

  console.log(`Found ${passages.length} passages to process under 'gemini 2'.`);

  let updatedCount = 0;
  for (const p of passages) {
    const prevScore = p.quality_score;
    const prevStatus = p.status;

    // Run the new quality check
    const quality = await evaluatePassageQuality({
      body: p.body,
      word_count: p.word_count,
      questionCount: p.questions.length,
      source: p.source,
      title: p.title,
    });

    // Update the database
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
    console.log(`  - Title: "${p.title}"`);
    console.log(`  - Word Count: ${p.word_count}`);
    console.log(`  - Score: ${prevScore} ➔ ${quality.quality_score}`);
    console.log(`  - Status: ${prevStatus} ➔ ${quality.status}`);
    
    updatedCount++;

    // Strict 4.5-second buffer to stay safely under the 15 RPM free tier rate limit
    await sleep(4500);
  }

  console.log(`\n✅ Done! Successfully recalculated and updated ${updatedCount} passages in the database.`);
}

main()
  .catch((err) => {
    console.error("❌ Fatal error during recalculation:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
