/**
 * client/src/types/session.ts
 *
 * TypeScript interfaces for Session and Response data models.
 */

export interface SessionResponse {
  id: string;
  session_id: string;
  question_id: string;
  selected_index: 0 | 1 | 2 | 3;
  is_correct: boolean;
  time_taken_ms: number;
  correct_index?: 0 | 1 | 2 | 3;
  explanations?: string[];
}

export interface Session {
  id: string;
  user_id: string;
  passage_id: string;
  target_wpm: number;
  actual_wpm: number;
  elapsed_ms: number;
  comprehension: 0 | 1 | 2 | 3;
  chunk_size: number;
  fading_used: boolean;
  guide_used: boolean;
  domain: string;
  started_at: string;
  completed_at: string;
}

/** Payload sent by the client when submitting a completed session */
export interface SessionSubmitPayload {
  passage_id: string;
  target_wpm: number;
  elapsed_ms: number;
  started_at: string;
  chunk_size: number;
  fading_used: boolean;
  guide_used: boolean;
  timezone_offset: number;
  responses: Array<{
    question_id: string;
    selected_index: 0 | 1 | 2 | 3;
    time_taken_ms: number;
  }>;
}

/** Full result returned after session submission */
export interface SessionResult {
  session: Session;
  responses: SessionResponse[];
  actual_wpm: number;
  comprehension: number;
}
