import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithDelay<T>(fn: () => Promise<T>, retries = 3, delay = 5000): Promise<T> {
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

async function generateTitles() {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
  });

  const passages = await prisma.passage.findMany({
    where: {
      status: "ready",
    },
  });

  console.log(`🚀 Starting titles generation for ${passages.length} passages...`);

  let countSuccess = 0;
  let countFailed = 0;

  for (let i = 0; i < passages.length; i++) {
    const passage = passages[i];
    console.log(`\n[${i + 1}/${passages.length}] Processing passage [${passage.id.slice(0, 8)}]: "${passage.topic_key}"`);

    try {
      const generatedTitle = await retryWithDelay(async () => {
        const prompt = `
          Analyze the GMAT/CAT-level reading passage below.
          Generate a highly professional, academic, concise 4-8 word title for this passage.
          The title must be extremely clean, polished, and represent serious scholarly discourse (no neons or generic titles).
          Respond with ONLY the generated title. Do not include markdown formatting or conversational text.
          
          Passage:
          ${passage.body}
        `;
        
        const res = await model.generateContent(prompt);
        return res.response.text().trim().replace(/['"“”]/g, "");
      });

      if (!generatedTitle || generatedTitle.length < 5) {
        throw new Error(`Invalid generated title: "${generatedTitle}"`);
      }

      await prisma.passage.update({
        where: { id: passage.id },
        data: { title: generatedTitle },
      });

      console.log(`  ✅ Successfully updated passage title to: "${generatedTitle}"`);
      countSuccess++;
    } catch (err: any) {
      console.error(`  ❌ Failed to generate title: ${err.message}`);
      countFailed++;
    }

    // Rate-limiting delay
    await sleep(2000);
  }

  console.log(`\n🎉 Titles generation complete! Success: ${countSuccess}, Failed: ${countFailed}`);
}

generateTitles().catch(console.error);
