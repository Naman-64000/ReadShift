/**
 * server/src/services/aiService.ts
 *
 * Google Gemini API integration for content generation.
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { logger } from "../lib/logger.js";
import { AppError } from "../types/index.js";

const LITE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-1.5-flash"
];

function getAIClient(customApiKey?: string | null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || "";
  return new GoogleGenerativeAI(apiKey);
}

// ── Passages ──────────────────────────────────────────────────

export const aiService = {
  /**
   * Generates a single analytical passage using Gemini.
   */
  async generatePassage(domain: string, userCustomApiKey?: string | null) {
    const genAIClient = getAIClient(userCustomApiKey);
    const dynamicTemperature = 0.95 + Math.random() * 0.25;
    let lastErr: any = null;

    let promptDomain = domain;
    if (domain.startsWith("arts_and_museum")) {
      const r = Math.random();
      const sub = r < 1/3 ? "arts" : (r < 2/3 ? "museum" : "arts and museum");
      promptDomain = domain.replace("arts_and_museum", sub);
    } else if (domain.startsWith("science_and_technology")) {
      const r = Math.random();
      const sub = r < 1/3 ? "science" : (r < 2/3 ? "technology" : "science and technology");
      promptDomain = domain.replace("science_and_technology", sub);
    }

    const prompt = `
        You are an elite professor designing extremely challenging reading comprehension passages to increase reading speed, focus, and comprehension.

        Write a single, highly dense, analytical passage at expert reading comprehension level (challenging difficulty for speed and retention training).
        Domain: ${promptDomain}.

        Difficulty Scaling Rules (Idea-Level Reasoning Density):
        - Focus the difficulty strictly on IDEA-LEVEL REASONING DENSITY rather than sentence-level lexical/vocabulary pretentiousness.
          * Wording should be clear, elegant, and readable—not packed with dry, obscure, or overly pretentious SAT/GRE words.
          * The true difficulty must arise from deep conceptual conflicts, contrasting intellectual viewpoints, dialectical arguments, competing interpretations, and unstated underlying assumptions.
          * Introduce a logical pivot or cognitive shift: for example, presenting a highly persuasive theory, and then showing how subtle empirical evidence or a methodological nuance complicates or challenges that consensus (e.g., "The theory appears persuasive, yet the archaeological record suggests otherwise.").
          * At least one major argument, interpretation, or conclusion should depend on an unstated or partially implicit assumption that attentive readers can infer but which is not directly spelled out.
          * Make the ideas/arguments hard to interpret, rather than hard to decode or read.
          * Broad Human/Societal Stakes: Ensure the central conflict is tethered to broader implications for human agency, institutional frameworks, or cultural paradigms. Even technical or abstract topics must avoid reading like insular manuals or textbook classifications; they must address why the problem matters to human systems or universal conceptual models.

        Core Structural Randomness & Variety Rules:
        - Avoid repetitive paragraph starters and transition cliches.
        - NEVER start the very first sentence of the passage with generic formulas like "The [noun]...", "The theory...", "The debate...", or "The history...". Instead, inject structural variety from the first word (e.g., start with a subordinating concession like "Although...", an adverbial phrase like "Historically...", a conditional clause, or a direct counter-hypothesis).
        - BANNED TRANSITIONS: You are strictly forbidden from using transitional cliches such as "Furthermore", "Moreover", "Additionally", "In addition", or "Consequently". Instead, rely on natural logical flow and contextual progression.
        - Each paragraph must start with a completely different grammatical construction.
        - Structure: MUST be structurally divided into exactly 3, 4, 5, or 6 paragraphs with clear thematic breaks. Each paragraph must be separated by exactly a double newline (\n\n).
        - Across generations, vary the underlying argumentative architecture. A passage may be organized around a paradox, competing theories, chronological development, methodological disagreement, reinterpretation of evidence, unintended consequences, conceptual clarification, or the collapse of a previously dominant explanation. Avoid repeatedly using the same organizational template.
        - For domains such as history, anthropology, economics, sociology, or philosophy, vary the analytical lens across generations (e.g., political, cultural, technological, institutional, economic, cognitive, environmental, methodological, or epistemological perspectives).

        Core Passage DO's:
        - Word count: MUST be strictly between 500 and 600 words (aim for approximately 530-550 words). Ensure each paragraph has at least 4 to 5 substantial sentences to maintain development and length.
        - Style: Dense, highly objective, analytical, and scholarly.
        - Transitions & Nuance: Actively use transition markers (such as "however", "although", "whereas", "rather than", "nevertheless") to signal shifts, and incorporate academic qualifiers (such as "arguably", "suggests", "appears to", "might", "partially") to reflect nuance.
        - Analytical Framing: When describing viewpoints, frame the arguments using structural terms (such as "claims", "evidence", "counterclaims", "qualifications", "rebuttals") to define the conflict clearly.
        - Domain Specificity: For scientific, mathematical, or technical topics, frame the passage around competing conceptual models or human/institutional friction, rather than just describing a mechanism or listing academic categories. Abstract the technology or theory to focus on its systemic impact on society or human thought.

        - Tension: The passage must examine a central intellectual debate, paradox, theoretical conflict, unresolved puzzle, or competing interpretation.
        - The central conflict, competing interpretations, and evidentiary tensions must be clearly present. Some passages may reveal these tensions explicitly, while others may allow them to emerge gradually through examples, evidence, methodological disputes, historical developments, or competing explanations. Avoid relying on a single recurring argumentative pattern across generations.
        - The passage need not always follow a binary debate structure. Depending on the topic, it may compare multiple explanatory frameworks, trace the evolution of an idea over time, examine competing methodologies, contrast evidence types, explore a paradox, or analyze a shift in scholarly consensus.
        - The author's ultimate position should remain nuanced and partially qualified. Avoid fully endorsing any single perspective; instead, acknowledge strengths, limitations, unresolved tensions, or areas of uncertainty where appropriate.
        - Vary both conceptual density and exposition style across passages. Some passages may lean heavily on theoretical reasoning, others on empirical evidence, historical narrative, methodological critique, intellectual biography, institutional analysis, or comparative case studies. Avoid making every paragraph equally dense or structurally similar.

        Core Passage DONT's:
        - DO NOT use bullet points, lists, headings, or section labels of any kind within the passage.
        - DO NOT write a dry, passive list of facts. It must be analytical and conceptual.
        - DO NOT include any introductory titles, headings, greetings, preambles, or conversational transitions.
        - DO NOT rely on a fixed "Theory A vs Theory B" template unless the topic genuinely demands it.

        Core Title Generation Rules:
        * Generate a professional, academically credible title that could plausibly appear as the title of a serious magazine essay, scholarly commentary, research overview, or intellectual review article.
        * The title should capture the passage's dominant idea, paradox, explanatory puzzle, methodological dispute, conceptual shift, competing interpretation, or central analytical theme.
        * Word count: 3-9 words.
        * Vary title architecture significantly across generations. Do NOT repeatedly rely on patterns such as:
          - "The X of Y"
          - "The Paradox of X"
          - "X and Y"
          - "The Limits of X"
          - "Rethinking X"
          - "Understanding X"
          - "The Rise of X"
        * Across generations, allow titles to take different forms, including:
          - descriptive,
          - conceptual,
          - comparative,
          - question-driven,
          - paradox-oriented,
          - process-oriented,
          - methodological,
          - causal,
          - historically framed,
          - metaphorically analytical.
        * Prefer specificity over generic academic phrasing.
        * The title should emerge naturally from the passage rather than sounding like a templated exam heading.
        * Avoid generic nouns such as "debate", "discussion", "issue", "challenge", "analysis", or "overview" unless they are essential to the passage.
        * Do not include quotation marks, markdown, subtitles, numbering, colons, or conversational language.
        * Use standard title casing.

        Core Paragraph Roadmaps Generation Rules:
        - For each paragraph in the passage, generate a concise roadmap that captures the paragraph's primary argumentative, rhetorical, or structural role within the overall passage.
        - The roadmap should reflect what a strong CAT/GMAT reader might mentally note after finishing the paragraph in order to track the flow of the author's reasoning and quickly recall the passage structure during question solving.
        - Prioritize FUNCTION over CONTENT. Focus primarily on what the paragraph does rather than simply what it discusses.
          Examples of paragraph functions include:
          * Introducing a problem or puzzle
          * Presenting a conventional explanation
          * Challenging a prevailing assumption
          * Introducing a competing interpretation
          * Providing supporting evidence
          * Developing a causal mechanism
          * Presenting a methodological critique
          * Highlighting a paradox or contradiction
          * Qualifying an earlier claim
          * Revising a framework
          * Drawing a tentative conclusion
          * Leaving an issue unresolved
        - The roadmap should resemble the kind of mental note made by a high-performing RC test-taker rather than a collection of extracted keywords.
        - Avoid mechanically listing concepts, entities, names, or terminology from the paragraph unless they are essential to understanding the paragraph's role.
        - The roadmap should help a reader answer questions such as: "Why was this paragraph included?", "How does it relate to the previous paragraph?", and "What role does it play in the author's overall argument?".
        - Each roadmap should typically be between 2 and 8 words long and formatted in Standard Title Case (e.g., "Conventional View Introduced", "Evidence Challenges Consensus", "Alternative Explanation Proposed", "Methodological Critique Presented", "Paradox Deepens").
        - Avoid forcing artificial "A → B → C → D" structures when the paragraph does not naturally contain a sequential progression.
        - Where appropriate, reflect the paragraph's stance or tone toward the ideas being discussed (e.g., support, critique, qualification, skepticism, reinterpretation, reconciliation, uncertainty).
        - The set of roadmaps should collectively allow a reader to reconstruct the passage's argumentative architecture at a glance.
        - The number of elements in the 'paragraph_roadmaps' array MUST EXACTLY match the number of paragraphs in the 'body' text.

        Generate the passage, its title, and the corresponding paragraph roadmaps, and output them in the required JSON format.
      `;

    for (const modelName of LITE_MODELS) {
      try {
        const model = genAIClient.getGenerativeModel({
          model: modelName,
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

        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text()) as { body: string; title: string; paragraph_roadmaps: string[] };
        let body = parsed.body.trim();
        // If the model did not output double newlines, normalize single newlines to double newlines
        if (!body.includes("\n\n") && body.includes("\n")) {
          body = body.replace(/\n+/g, "\n\n");
        }
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
          generated_by: modelName,
          paragraph_roadmaps,
        };
      } catch (err) {
        logger.warn({ modelName, err }, "Gemini model failed in generatePassage, trying backup...");
        lastErr = err;
      }
    }

    logger.error({ lastErr, domain }, "All Gemini models failed in generatePassage");
    throw new AppError("INTERNAL_ERROR", "Failed to generate passage across all fallback models", 500);
  },

  /**
   * Generates a single high-difficulty metronome drill passage (65-85 words) and a 2-option MCQ.
   */
  async generateDrillPassage(level: number, userCustomApiKey?: string | null) {
    const genAIClient = getAIClient(userCustomApiKey);
    const dynamicTemperature = 0.95 + Math.random() * 0.25;
    let lastErr: any = null;

    const domains = ["philosophy", "psychology", "history", "arts_and_museum", "society", "culture", "biology", "science_and_technology"];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];

    const prompt = `
        You are an elite professor designing extremely challenging speed-reading drill paragraphs (Subvocalization Metronome Drills) to train high-level readers.

        Write a single, highly dense, analytical paragraph at expert reading comprehension level (highly challenging difficulty for speed and retention training).
        Domain: ${randomDomain}.
        Level of Drill: L${level}.

        Rules for Paragraph:
        - Word count: MUST be strictly between 65 and 85 words.
        - Structure: Must be exactly one single paragraph. No line breaks.
        - Difficulty: Focus on idea-level reasoning density. The paragraph should contain a logical pivot or cognitive shift (e.g. presenting a concept/consensus, and immediately introducing a subtle nuance or counterpoint).
        - Style: Extremely dense, scholarly, and analytical.
        - No titles, headings, markdown formatting, or preambles of any kind.

        Rules for Question:
        - Generate exactly one active-recall question that tests the reader's comprehension of the paragraph's core argument or conceptual pivot.
        - The question stem must be academic and specific to the paragraph. Do not start with "According to the passage..." or similar.
        - Provide exactly 2 options (option A at index 0, option B at index 1). The options must be parallel, grammatically similar, and intellectually plausible.
        - Specify the correct index (0 or 1).
    `;

    for (const modelName of LITE_MODELS) {
      try {
        const model = genAIClient.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: dynamicTemperature,
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                body: { type: SchemaType.STRING },
                question: {
                  type: SchemaType.OBJECT,
                  properties: {
                    stem: { type: SchemaType.STRING },
                    options: {
                      type: SchemaType.ARRAY,
                      items: { type: SchemaType.STRING }
                    },
                    correct_index: { type: SchemaType.INTEGER }
                  },
                  required: ["stem", "options", "correct_index"]
                }
              },
              required: ["body", "question"]
            } as any
          }
        });

        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text()) as {
          body: string;
          question: {
            stem: string;
            options: string[];
            correct_index: number;
          }
        };

        const body = parsed.body.trim();
        const wordCount = body.split(/\s+/).filter(Boolean).length;

        if (wordCount < 40 || wordCount > 130) {
          throw new Error(`Generated drill paragraph outside expected word range (${wordCount} words)`);
        }

        const opts = parsed.question.options.map(o => o.trim());
        if (opts.length !== 2) {
          throw new Error("Drill question must have exactly 2 options");
        }

        const correctIdx = parsed.question.correct_index === 1 ? 1 : 0;

        return {
          body,
          word_count: wordCount,
          question_stem: parsed.question.stem.trim(),
          options: opts as [string, string],
          correct_index: correctIdx,
        };
      } catch (err) {
        logger.warn({ modelName, err }, "Gemini model failed in generateDrillPassage, trying backup...");
        lastErr = err;
      }
    }

    logger.error({ lastErr, level }, "All Gemini models failed in generateDrillPassage");
    throw new AppError("INTERNAL_ERROR", "Failed to generate drill passage across all fallback models", 500);
  },

  /**
   * Generates 3 highly rigorous GMAT-style MCQs for a given passage using Structured Output.
   * Mandates: Q1 = Primary Rhetorical Purpose, Q2 = Paragraph/Rhetorical Role, Q3 = Inference/Assumption.
   * Includes exactly four 2-line explanations for why each option is correct or incorrect.
   */
  async generateQuestions(passageBody: string, userCustomApiKey?: string | null) {
    const genAIClient = getAIClient(userCustomApiKey);
    let lastErr: any = null;

    const prompt = `
        Given the high-difficulty academic passage below, produce exactly 3 multiple choice questions that mirror the intellectual rigour of elite examinations (GMAT/CAT Reading Comprehension).

        You MUST provide exactly one of each type, adhering to the following structural blueprints:

        1. "main_idea"
           - Focuses on the primary rhetorical purpose, central thesis, overarching tension, or the author's communicative objective in writing the passage.

        2. "inference"
           - Focuses on argument structure, rhetorical function, paragraph relationships, evidentiary roles, conceptual pivots, methodological critiques, or the progression of ideas across the passage.

        3. "vocab"
           - Focuses on unstated assumptions, underlying premises, logical implications, hidden dependencies, qualified conclusions, conceptual consequences, or deductions that require reasoning beyond explicit statements.

        Core Question Design Philosophy:
        - Questions should primarily test comprehension of ideas, reasoning, argument structure, assumptions, and conceptual relationships rather than memory of isolated facts, phrases, or sentences.
        - The question set should emerge naturally from the passage's actual argumentative architecture.
        - If the passage centers on competing theories, methodological critique, evidentiary disputes, paradoxes, causal explanations, conceptual shifts, unresolved tensions, or reinterpretations of evidence, the questions should directly test those structures rather than forcing generic templates.
        - Reward deep understanding of the passage's logic rather than successful keyword matching or sentence recall.

        Core Question Stem Phrasing Rules (CRITICAL - READ CAREFULLY):
        - NEVER start any question stem with generic, repetitive formulas.
          * BANNED PREFIXES:
            - "Based on the passage..."
            - "According to the passage..."
            - "In the context of the passage..."
            - "What is the passage's..."
            - "The author states..."
            - "Based on the text..."
            - "According to the author..."
            - "In paragraph X,..."

        - The question stems must be highly organic, scholarly, and custom-infused with the specific names, entities, concepts, and arguments of this passage.

        - Vary question stem style across generations.
          * Some stems may be rhetorically sophisticated and GMAT-like.
          * Others may appear deceptively simple in wording while requiring deep comprehension to answer correctly.
          * Avoid repeatedly using the same stem architecture even when the question category remains unchanged.

        - Structure question stems using advanced RC styles:
          * For "main_idea":
            - "The author's primary focus in the passage is to..."
            - "Which of the following best describes the central intellectual tension explored in the passage?"
            - "The passage is primarily concerned with..."
            - "The author references [specific concept] primarily in order to..."

          * For "inference":
            - "The relationship between the third paragraph and the second paragraph is best described as..."
            - "The discussion of [specific concept/entity] primarily serves which rhetorical function?"
            - "How does the final section modify or qualify the position developed earlier in the passage?"
            - "The introduction of [concept] most directly contributes to which stage of the author's argument?"

          * For "vocab":
            - "The author's argument regarding [concept] relies on which unstated assumption?"
            - "It can reasonably be inferred that a supporter of [framework/theory] would view [concept] as..."
            - "Which of the following must be true for the author's explanation to remain persuasive?"
            - "The reasoning presented in the passage depends most heavily on which underlying premise?"

        Core Option Generation Rules:
        - Exactly 4 options per question (A, B, C, D order).
        - Only one correct answer.
        - Options must be grammatically parallel, intellectually plausible, and conceptually close enough that superficial elimination is difficult.
        - Avoid obviously wrong answers.
        - Avoid options that can be eliminated solely through keyword matching.
        - The correct answer should require reasoning about relationships, implications, argument structure, assumptions, qualifications, or conceptual distinctions.

        Incorrect Option Construction:
        - Incorrect options should arise naturally from plausible misreadings, overextensions, partial truths, mistaken causal reasoning, incorrect scope boundaries, misplaced emphasis, flawed assumptions, inaccurate extrapolations, or confusion between related concepts.
        - Avoid making distractor patterns mechanically predictable across generations.
        - Avoid making the correct answer consistently the longest, most nuanced, or most qualified option.
        - Avoid excessive use of extreme-language traps unless the passage itself justifies such wording.

        Author Position & Nuance Awareness:
        - Where appropriate, questions may test the author's degree of agreement, qualified endorsement, skepticism, evaluation of competing perspectives, treatment of uncertainty, or nuanced positioning between competing viewpoints.
        - Preserve the passage's complexity rather than simplifying the author's stance into a binary position.

        Question Diversity Across Generations:
        - Avoid repeatedly targeting the same paragraph position or argumentative role.
        - Across generations, vary whether questions focus on:
          * opening frameworks,
          * conceptual definitions,
          * analytical pivots,
          * competing interpretations,
          * evidentiary challenges,
          * methodological critiques,
          * causal explanations,
          * concluding qualifications,
          * implicit assumptions,
          * unresolved tensions.
        - Avoid generating the same style of reasoning task repeatedly across passages.

        Core Option Explanation Rules:
        - For every question, provide an "explanations" array containing exactly four explanation strings corresponding strictly to each option in options[] order.
        - Each explanation must contain exactly 2 sentences.
        - Each explanation should focus on reasoning quality, conceptual accuracy, argumentative fit, logical traps, scope issues, assumption failures, or structural misunderstandings rather than simple textual lookup.
        - Explanations should teach the thinking process used to evaluate the option.

        Passage:
        ${passageBody}
      `;

    for (const modelName of LITE_MODELS) {
      try {
        const model = genAIClient.getGenerativeModel({
          model: modelName,
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
        logger.warn({ modelName, err }, "Gemini model failed in generateQuestions, trying backup...");
        lastErr = err;
      }
    }

    logger.error({ lastErr }, "All Gemini models failed in generateQuestions");
    throw new AppError("INTERNAL_ERROR", "Failed to generate questions across all fallback models", 500);
  },
};
