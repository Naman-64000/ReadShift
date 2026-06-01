/**
 * client/src/types/passage.ts
 *
 * TypeScript interfaces for Passage and Question data models.
 */

import type { Domain } from "./user";

export type QuestionType = "main_idea" | "inference" | "vocab";

export interface Question {
  id: string;
  passage_id: string;
  type: QuestionType;
  stem: string;
  options: [string, string, string, string]; // Always exactly 4
  explanations?: string[]; // 4 explanation strings (A, B, C, D order)
  // correct_index is NOT included — only returned by the API after submission
}

export interface QuestionWithAnswer extends Question {
  correct_index: 0 | 1 | 2 | 3;
}

export interface Passage {
  id: string;
  body: string;
  word_count: number;
  domain: Domain;
  generated_by: string;
  flagged: boolean;
  created_at: string;
}

/** Passage + questions as returned by GET /api/sessions/start */
export interface PassageWithQuestions {
  passage: Passage;
  questions: Question[];
}
