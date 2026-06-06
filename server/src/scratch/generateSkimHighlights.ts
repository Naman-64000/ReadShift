import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Polyfill global fetch for older Node versions
if (!globalThis.fetch) {
  (globalThis as any).fetch = fetch;
  (globalThis as any).Headers = (fetch as any).Headers;
  (globalThis as any).Request = (fetch as any).Request;
  (globalThis as any).Response = (fetch as any).Response;
}

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const passages = await prisma.passage.findMany({
    where: {
      skim_highlights: {
        equals: [],
      },
    },
  });

  console.log(`Found ${passages.length} passages needing skim highlights.`);

  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          skim_highlights: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: ["skim_highlights"]
      } as any
    }
  });

  for (let idx = 0; idx < passages.length; idx++) {
    const passage = passages[idx];
    console.log(`[${idx + 1}/${passages.length}] Generating highlights for: "${passage.title}"...`);

    const prompt = `
      You are an expert Reading Comprehension (RC) instructor.
      Analyze the passage below and extract exactly 5 strategic selection phases of skimming highlights (3-6 key structural/conceptual phrases per phase) representing a 15-second scan:
      - Phase 1 (Topic Identification): Core introductory terms, primary subjects, and key theme markers from the first 1-2 lines of the passage to quickly identify the academic domain.
      - Phase 2 (Difficulty Anchors): Unconventional jargon, capitalized entities, specific theories, or complex concepts distributed throughout the passage that signal theoretical difficulty.
      - Phase 3 (Argument Structure & Pivots): Pivotal contrast words, concessions, and transitional cues (such as "however", "yet", "although", "despite", "rather than", "alternative explanation") indicating logical shifts.
      - Phase 4 (Complexity Estimate): Key phrases indicating methodological critiques, causal ambiguity, evidence conflicts, or analytical disputes.
      - Phase 5 (Conclusion Preview): Concluding indicators, final author stance signals, or remaining uncertainty markers from the last paragraph of the passage.

      
      CRITICAL REQUIREMENTS:
      1. Each phase MUST be returned as a single string containing a comma-separated list of selected phrases.
      2. Every phrase in the comma-separated list MUST be an EXACT case-sensitive and character-perfect substring of the passage text.
      3. The output array 'skim_highlights' must contain EXACTLY 5 strings.
      
      Passage:
      ${passage.body}
    `;

    try {
      // Add a 4 second sleep to stay within free-tier rate limits
      await sleep(4000);

      const response = await model.generateContent(prompt);
      const parsed = JSON.parse(response.response.text()) as { skim_highlights: string[] };

      if (!parsed.skim_highlights || parsed.skim_highlights.length !== 5) {
        throw new Error("Invalid highlights length returned");
      }

      // Verify that all phrases are exact substrings of the body
      const cleanHighlights = parsed.skim_highlights.map((h, phaseIdx) => {
        const phrases = h.split(",").map(p => p.trim()).filter(Boolean);
        const verified = phrases.filter(p => {
          const exists = passage.body.includes(p);
          if (!exists) {
            console.warn(`WARNING: Phrase "${p}" in phase ${phaseIdx} is not an exact substring! Skipping.`);
          }
          return exists;
        });
        return verified.join(", ");
      });

      await prisma.passage.update({
        where: { id: passage.id },
        data: {
          skim_highlights: cleanHighlights,
        },
      });

      console.log(`Updated successfully.`);
    } catch (e: any) {
      console.error(`Failed for passage "${passage.title}":`, e.message);
      // Wait extra if we hit a rate limit
      if (e.message.includes("quota") || e.message.includes("429")) {
        console.log("Rate limit hit. Sleeping for 45s...");
        await sleep(45000);
        idx--; // retry this index
      }
    }
  }

  console.log("Done generating skim highlights for all passages!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
