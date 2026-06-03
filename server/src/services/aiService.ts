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
  async generatePassage(domain: string) {
    try {
      // Dynamic temperature randomization (0.95 - 1.2) for high structural and semantic diversity
      const dynamicTemperature = 0.95 + Math.random() * 0.25;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-flash-lite",
        generationConfig: {
          temperature: dynamicTemperature,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              body: { type: SchemaType.STRING },
              title: { type: SchemaType.STRING },
              paragraph_roadmaps: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              }
            },
            required: ["body", "title", "paragraph_roadmaps"]
          } as any
        }
      });

      const prompt = `
        You are an elite professor designing extremely challenging reading comprehension passages to increase reading speed, focus, and comprehension.
        
        Write a single, highly dense, analytical passage at expert reading comprehension level (highly challenging difficulty for speed and retention training).
        Domain: ${domain}.
        
        Difficulty Scaling Rules (Idea-Level Reasoning Density):
        - Focus the difficulty strictly on IDEA-LEVEL REASONING DENSITY rather than sentence-level lexical/vocabulary pretentiousness. 
          * Wording should be clear, elegant, and readable—not packed with dry, obscure, or overly pretentious SAT/GRE words.
          * The true difficulty must arise from deep conceptual conflicts, contrasting intellectual viewpoints, dialectical arguments, and unstated underlying assumptions.
          * Introduce a logical pivot or cognitive shift: for example, presenting a highly persuasive theory, and then showing how subtle empirical evidence or a methodological nuance complicates or challenges that consensus (e.g., "The theory appears persuasive, yet the archaeological record suggests otherwise.").
          * Make the ideas/arguments hard to interpret, rather than hard to decode or read.
        
        Core Structural Randomness & Variety Rules:
        - Avoid repetitive paragraph starters and transition cliches.
        - **NEVER** start the very first sentence of the passage with generic formulas like "The [noun]...", "The theory...", "The debate...", or "The history...". Instead, inject structural variety from the first word (e.g., start with a subordinating concession like "Although...", an adverbial phrase like "Historically...", a conditional clause, or a direct counter-hypothesis).
        - **BANNED TRANSITIONS:** You are strictly forbidden from using transitional cliches such as "Furthermore", "Moreover", "Additionally", "In addition", or "Consequently". Instead, rely on natural logical flow and contextual progression.
        - Each paragraph must start with a completely different grammatical construction.
        - Structure: MUST be structurally divided into exactly 3, 4, 5, or 6 paragraphs with clear thematic breaks.
        
        Core Passage DO's:
        - Word count: MUST be strictly between 460 and 580 words.
        - Style: Dense, highly objective, analytical, and scholarly.
        - Tension: The passage must examine a central intellectual debate, paradox, or theoretical conflict.
        
        Core Passage DONT's:
        - DO NOT use bullet points, lists, headings, or section labels of any kind.
        - DO NOT write a dry, passive list of facts. It must be analytical and conceptual.
        - DO NOT include any introductory titles, headings, greetings, preambles, or conversational transitions.
        
        Core Title Generation Rules:
        - Generate a highly professional, academic, concise 4-8 word title representing the core focus or dialectical tension of the passage (e.g., "The Paradigmatic Shift in Late-Antique Epistemology"). Do not include quotes, markdown formatting, or conversational text.
        
        Core Paragraph Roadmaps Generation Rules:
        - For each paragraph in the generated passage, you MUST generate a high-quality 3-4 word keyword flow summary separated by arrows (e.g., "Hypothesis → Methodology → Control Group → Result").
        - The flow summary must capture the logical transition or thematic pivot of that specific paragraph in 3 or 4 concise words or short phrases connected by arrows.
        - The number of elements in the 'paragraph_roadmaps' array MUST EXACTLY match the number of paragraphs in the 'body' text.
        
        Generate the passage, its title, and the corresponding paragraph roadmaps, and output them in the required JSON format.
      `;

      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text()) as { body: string; title: string; paragraph_roadmaps: string[] };
      const body = parsed.body.trim();
      const paragraph_roadmaps = parsed.paragraph_roadmaps.map(r => r.trim());
      const wordCount = body.split(/\s+/).filter(Boolean).length;

      if (wordCount < 400 || wordCount > 620) {
        throw new Error("Generated passage outside expected word range");
      }

      const paraCount = body.split(/\n\s*\n/g).filter(Boolean).length;
      if (paraCount !== paragraph_roadmaps.length) {
        throw new Error(`Paragraph count (${paraCount}) does not match roadmaps count (${paragraph_roadmaps.length})`);
      }

      return {
        body,
        title: parsed.title ? parsed.title.trim().replace(/['"“”]/g, "") : "Academic Reading Passage",
        word_count: wordCount,
        domain,
        generated_by: "gemini-3.1-flash-lite",
        paragraph_roadmaps,
      };
    } catch (err) {
      logger.error({ err, domain }, "Gemini passage generation failed");
      throw new AppError("INTERNAL_ERROR", "Failed to generate passage", 500);
    }
  },

  /**
   * Generates 3 highly rigorous GMAT-style MCQs for a given passage using Structured Output.
   * Mandates: Q1 = Primary Rhetorical Purpose, Q2 = Paragraph/Rhetorical Role, Q3 = Inference/Assumption.
   * Includes exactly four 2-line explanations for why each option is correct or incorrect.
   */
  async generateQuestions(passageBody: string) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
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
                explanations: {
                   type: SchemaType.ARRAY,
                   items: { type: SchemaType.STRING },
                   minItems: 4,
                   maxItems: 4
                }
              },
              required: ["type", "stem", "options", "correct_index", "explanations"],
            },
          } as any,
        },
      });

      const prompt = `
        Given the high-difficulty academic passage below, produce exactly 3 multiple choice questions that mirror the intellectual rigour of elite examinations (GMAT/CAT Reading Comprehension).
        You MUST provide exactly one of each type, adhering to the following structural blueprints:
        
        1. "main_idea": Focuses on the primary rhetorical purpose, central thesis, or the author's overarching communicative objective in writing the passage.
        2. "inference" (Paragraph/Rhetorical Role focus): Focuses on argument structure, transition pivots, and paragraph functions.
        3. "vocab" (Contextual Inference focus): Requires identifying unstated assumptions, underlying premises, or logical deductions from specific claims or vocabulary concepts.
        
        Core Question Stem Phrasing Rules (CRITICAL - READ CAREFULLY):
        - **NEVER** start any question stem with generic, repetitive formulas. 
          * BANNED PREFIXES: "Based on the passage...", "According to the passage...", "In the context of the passage...", "What is the passage's...", "The author states...", "Based on the text...", "According to the author...", "In paragraph X,...".
        - The question stems must be highly organic, scholarly, and custom-infused with the specific names, entities, concepts, and arguments of this passage.
        - Structure question stems using advanced GMAT rhetorical styles:
          * For "main_idea": Use phrasing like: "The author's primary focus in the passage is to...", "Which of the following best describes the dialectical goal of the passage?", "The passage is primarily concerned with...", "The author references [specific concept from passage] primarily in order to...".
          * For "inference": Use phrasing like: "The relationship between the third paragraph and the second paragraph is best described as...", "In the second paragraph, the author introduces [concept/entity] primarily to serve which of the following rhetorical functions?", "How does the passage's final paragraph resolve the tension established in the opening section?".
          * For "vocab": Use phrasing like: "The author's argument regarding [concept] relies on which of the following unstated assumptions?", "It can be inferred from the passage that a proponent of [theory] would view [concept] as...", "Which of the following, if true, would most seriously weaken the author's explanation of [phenomenon] in the final paragraph?".
        
        Core Option Generation Rules (Plausible Distractor Traps):
        - Exactly 4 options per question (A, B, C, D order).
        - Only one correct answer.
        - Options must be syntactically long, grammatically parallel, highly plausible, and conceptually close to each other. They must be a little hard to eliminate easily but not confusing or unfair.
        - The incorrect distractors must represent realistic GMAT cognitive traps:
          * Out of Scope (introducing plausible but external ideas not in text).
          * Extreme Language (using absolute modifiers like 'always', 'never', 'solely' when the text is qualified).
          * True but Irrelevant (factually correct statement from the text that fails to answer the specific question asked).
          * Direct Contradiction (reversing the relationship stated in the text).
          * Misapplied Relationship (connecting two ideas from different parts of the text incorrectly).
        
        Core Option Explanation Rules:
        - For every question, you MUST provide an "explanations" array containing exactly four 2-line explanation strings corresponding strictly to each option in options[] order.
        - Each explanation must be exactly 2 sentences (2 lines) and clearly justify why that specific option is CORRECT or INCORRECT.
        - The explanations MUST be focused on the LEVEL OF THINKING, logical traps, and structural relationships (e.g. "Option A is incorrect because it commits an Extreme Language trap; the author argues that the trend is shifting, not that it is entirely completed.") rather than mere surface factuality or simple text lookups.
        
        Passage:
        ${passageBody}
      `;

      const result = await model.generateContent(prompt);
      const questions = JSON.parse(result.response.text()) as Array<{
        type: "main_idea" | "inference" | "vocab";
        stem: string;
        options: string[];
        correct_index: number;
        explanations: string[];
      }>;

      // Validation: Ensure exactly one of each type and proper array bounds
      const types = questions.map((q) => q.type);
      const required = ["main_idea", "inference", "vocab"];
      const missing = required.filter((r) => !types.includes(r as any));

      if (missing.length > 0 || questions.length !== 3) {
        throw new Error(`AI generated invalid question set. Missing: ${missing.join(", ")}`);
      }

      for (const q of questions) {
        if (!q.explanations || q.explanations.length !== 4) {
          throw new Error("AI generated questions missing exact explanation arrays");
        }
      }

      return questions;
    } catch (err) {
      logger.error({ err }, "Gemini question generation failed");
      throw new AppError("INTERNAL_ERROR", "Failed to generate questions", 500);
    }
  },
};
