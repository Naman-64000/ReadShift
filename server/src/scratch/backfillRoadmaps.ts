/**
 * server/src/scratch/backfillRoadmaps.ts
 */
import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

async function backfill() {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING }
      } as any
    }
  });

  const passages = await prisma.passage.findMany({
    where: { domain: "society" },
  });

  console.log(`🚀 Starting roadmaps backfill for ${passages.length} society passages...`);

  let countSuccess = 0;
  let countFailed = 0;

  for (let i = 0; i < passages.length; i++) {
    const passage = passages[i];
    console.log(`\n[${i + 1}/${passages.length}] Processing passage [${passage.id.slice(0, 8)}]: "${passage.topic_key}"`);

    const paragraphs = passage.body.split(/\n\s*\n/g).map(p => p.trim()).filter(Boolean);
    
    try {
      const roadmaps = await retryWithDelay(async () => {
        const prompt = `
          Analyze the GMAT/CAT-level reading passage below, which is split into ${paragraphs.length} paragraphs.
          For each paragraph, generate a 3-4 word keyword flow summary showing its logical progression, separated by arrows.
          
          Example Summary Blueprints:
          - "Hypothesis → Methodology → Control Group → Result"
          - "Consensus → Complication → Empirical Test → New Path"
          - "Game Theory → Cognitive Anomalies → Microtransaction → Market Shift"
          
          You must output a JSON array containing exactly ${paragraphs.length} strings, where each string represents the 3-4 word keyword flow summary (using " → " arrows) for the corresponding paragraph in order.
          Do not include markdown markers or conversational preambles.
          
          Passage:
          ${passage.body}
        `;
        
        const res = await model.generateContent(prompt);
        const parsed = JSON.parse(res.response.text()) as string[];
        return parsed.map(r => r.trim());
      });

      if (roadmaps.length !== paragraphs.length) {
        throw new Error(`Roadmap count (${roadmaps.length}) does not match paragraph count (${paragraphs.length})`);
      }

      await prisma.passage.update({
        where: { id: passage.id },
        data: { paragraph_roadmaps: roadmaps },
      });

      console.log(`  ✅ Successfully updated passage!`);
      roadmaps.forEach((r, idx) => {
        console.log(`     P${idx + 1}: ${r}`);
      });
      countSuccess++;
    } catch (err: any) {
      console.error(`  ❌ Failed to backfill passage: ${err.message}`);
      countFailed++;
    }

    // Rate-limiting delay
    await sleep(2000);
  }

  console.log(`\n🎉 Backfill complete! Success: ${countSuccess}, Failed: ${countFailed}`);
}

backfill().catch(console.error);
