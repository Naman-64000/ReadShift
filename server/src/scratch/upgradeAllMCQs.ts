import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { aiService } from "../services/aiService.js";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Robust retry wrapper for Gemini AI API calls
async function retryWithDelay<T>(fn: () => Promise<T>, retries = 5, delay = 8000): Promise<T> {
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
  console.log("🚀 Starting Universal MCQ Upgrade Migration Script...");
  
  // Fetch all passages in the database
  const passages = await prisma.passage.findMany({
    select: {
      id: true,
      body: true,
      domain: true,
      status: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  const total = passages.length;
  console.log(`📊 Found ${total} passages in the database. Preparing to regenerate ${total * 3} MCQs with GMAT difficulty logic.\n`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < total; i++) {
    const passage = passages[i];
    console.log(`[${i + 1}/${total}] Domain: "${passage.domain}" | Status: "${passage.status}" | ID: [${passage.id}]`);

    try {
      // 1. Generate questions & explanations using the newly upgraded aiService
      console.log("  - Generating 3 rigorous GMAT/CAT structured MCQs (with 2-line option explanations)...");
      const questionsData = await retryWithDelay(async () => {
        return await aiService.generateQuestions(passage.body);
      });

      // 2. Persist to DB inside a transaction (delete existing questions and create the new ones)
      await prisma.$transaction(async (tx) => {
        // Delete all old questions for this passage
        await tx.question.deleteMany({
          where: { passage_id: passage.id },
        });

        // Insert the new ones with explanations
        for (const q of questionsData) {
          await tx.question.create({
            data: {
              passage_id: passage.id,
              type: q.type as any,
              stem: q.stem,
              options: q.options,
              correct_index: q.correct_index,
              explanations: q.explanations,
            },
          });
        }
      });

      successCount++;
      console.log(`  ✅ Successfully updated MCQs & explanations for [${passage.id.slice(0, 8)}]`);

      // 3. Politeness buffer to comply with API rate limits (~15 RPM safety)
      if (i < total - 1) {
        console.log("  - Waiting 2 seconds buffer...");
        await sleep(2000);
      }
    } catch (err: any) {
      failureCount++;
      console.error(`  ❌ Failed to regenerate MCQs for passage [${passage.id}].`);
      console.error(`     Error: ${err.message}`);
      console.log("  - Waiting 5 seconds before moving to the next passage...");
      await sleep(5000);
    }
  }

  console.log("\n🏁 MCQ Upgrade Migration Completed!");
  console.log(`🎉 Success: ${successCount}/${total} passages updated (${successCount * 3} MCQs)`);
  console.log(`⚠️ Failures: ${failureCount}/${total} passages failed`);
}

main()
  .catch((err) => {
    console.error("❌ Fatal migration error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
