/**
 * server/src/services/aiService.ts
 *
 * Google Gemini API integration for content generation.
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { logger } from "../lib/logger.js";
import { AppError } from "../types/index.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ── Passages ──────────────────────────────────────────────────

export const aiService = {
  /**
   * Generates a single analytical passage using Gemini.
   */
  async generatePassage(domain: string, level: number) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You write reading comprehension passages for competitive exams (GMAT, CAT). 
        Write a single analytical paragraph for a Level ${level} reader.
        Domain: ${domain}.
        
        Rules:
        - Word count: 450–550 words.
        - Use 3 to 6 paragraphs with natural paragraph breaks.
        - No headings, no lists, no bullet points, no direct quotes, and no labels like [Passage 1].
        - The passage must present an argument or explain a tension/paradox.
        - Style: Analytical, dense, and formal.
        - No proper nouns as the main hook.
        
        Respond with ONLY the passage text. No preamble.
      `;

      const result = await model.generateContent(prompt);
      const body = result.response.text().trim();
      const wordCount = body.split(/\s+/).filter(Boolean).length;

      if (wordCount < 420 || wordCount > 600) {
        throw new Error("Generated passage outside expected word range");
      }

      return {
        body,
        word_count: wordCount,
        domain,
        level,
        generated_by: "gemini-1.5-flash",
      };
    } catch (err) {
      logger.error({ err, domain, level }, "Gemini passage generation failed");
      throw new AppError("INTERNAL_ERROR", "Failed to generate passage", 500);
    }
  },

  /**
   * Generates 3 MCQs for a given passage using Structured Output.
   */
  async generateQuestions(passageBody: string) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                type: { type: SchemaType.STRING, enum: ["main_idea", "inference", "vocab"] },
                stem: { type: SchemaType.STRING },
                options: { 
                  type: SchemaType.ARRAY, 
                  items: { type: SchemaType.STRING },
                  minItems: 4,
                  maxItems: 4 
                },
                correct_index: { type: SchemaType.NUMBER },
              },
              required: ["type", "stem", "options", "correct_index"],
            },
          } as any,
        },
      });

      const prompt = `
        Given the passage below, produce exactly 3 GMAT-style multiple choice questions.
        You MUST provide exactly one of each type:
        1. "main_idea": Focuses on the primary purpose or main argument.
        2. "inference": Requires logical deduction from provided facts.
        3. "vocab": Tests the meaning of a specific word or phrase in context.
        
        Rules:
        - Exactly 4 options per question.
        - Only one correct answer.
        - Options should be plausible but distinct.
        
        Passage:
        ${passageBody}
      `;

      const result = await model.generateContent(prompt);
      const questions = JSON.parse(result.response.text()) as Array<{
        type: "main_idea" | "inference" | "vocab";
        stem: string;
        options: string[];
        correct_index: number;
      }>;

      // Validation: Ensure exactly one of each type
      const types = questions.map((q) => q.type);
      const required = ["main_idea", "inference", "vocab"];
      const missing = required.filter((r) => !types.includes(r as any));

      if (missing.length > 0 || questions.length !== 3) {
        throw new Error(`AI generated invalid question set. Missing: ${missing.join(", ")}`);
      }

      return questions;
    } catch (err) {
      logger.error({ err }, "Gemini question generation failed");
      throw new AppError("INTERNAL_ERROR", "Failed to generate questions", 500);
    }
  },
};
