/**
 * client/src/store/sessionSlice.ts
 * Zustand slice for the active reading session state machine.
 */

import { create } from "zustand";
import type { PassageWithQuestions, SessionResult, SessionSubmitPayload } from "@/types";
import { apiClient } from "@/lib/apiClient";

type SessionPhase = "idle" | "config" | "reading" | "mcq" | "results";

export interface SessionConfig {
  target_wpm: number;
  chunk_size: 2 | 3;
  fading_enabled: boolean;
  guide_enabled: boolean;
  domain?: string;
  passage_id?: string;
}

export interface PendingResponse {
  question_id: string;
  selected_index: 0 | 1 | 2 | 3;
  time_taken_ms: number;
}

interface SessionState {
  phase: SessionPhase;
  passage: PassageWithQuestions | null;
  passageDomain: string | null;
  config: SessionConfig | null;
  readingStartedAt: number | null;    // Date.now() ms timestamp
  elapsedMs: number;
  timeSpentMs: number;
  responses: PendingResponse[];
  result: SessionResult | null;
  isSubmitting: boolean;
  error: string | null;

  startSession: (config: SessionConfig) => Promise<void>;
  prefetchPassage: (domain?: string) => Promise<void>;
  markReadingDone: (elapsedMs: number, timeSpentMs?: number) => void;
  submitAnswer: (response: PendingResponse) => void;
  submitSession: () => Promise<void>;
  resetSession: () => void;
  setError: (error: string | null) => void;
  lastSelectedWpm: number | null;
  setLastSelectedWpm: (wpm: number | null) => void;
}

type StartSessionResponse =
  | PassageWithQuestions
  | {
      id: string;
      body: string;
      word_count: number;
      domain: string;
      generated_by: string;
      flagged: boolean;
      title: string;
      paragraph_roadmaps?: string[];
      created_at: string;
      questions: PassageWithQuestions["questions"];
    };


function normalizePassage(data: StartSessionResponse): PassageWithQuestions {
  if ("passage" in data) return data;

  const { questions, ...passage } = data;
  return {
    passage: {
      ...passage,
      domain: passage.domain as PassageWithQuestions["passage"]["domain"],
    },
    questions,
  };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  phase: "idle",
  passage: null,
  passageDomain: null,
  config: null,
  readingStartedAt: null,
  elapsedMs: 0,
  timeSpentMs: 0,
  responses: [],
  result: null,
  isSubmitting: false,
  error: null,
  lastSelectedWpm: null,
  setLastSelectedWpm: (wpm) => set({ lastSelectedWpm: wpm }),

  startSession: async (config) => {
    const { passage, passageDomain } = get();
    const requestedDomain = config.domain ?? null;

    // Reuse pre-fetched passage only when it matches the exact requested domain context
    if (passage && passageDomain === requestedDomain) {
      set({ 
        phase: "reading", 
        config, 
        error: null, 
        responses: [], 
        result: null,
        readingStartedAt: Date.now() 
      });
      return;
    }

    // Otherwise fetch one now
    set({ phase: "config", config, error: null, passage: null, responses: [], result: null });
    try {
      const params: { domain?: string; passage_id?: string } = {};
      if (config.domain) params.domain = config.domain;
      if (config.passage_id) params.passage_id = config.passage_id;
      
      const res = await apiClient.post<{ data: StartSessionResponse }>("/sessions/start", params);
      const normalized = normalizePassage(res.data.data);
      set({
        passage: normalized,
        passageDomain: normalized.passage.domain,
        readingStartedAt: Date.now(),
        phase: "reading",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start session";
      set({ error: message, phase: "idle" });
    }
  },

  prefetchPassage: async (domain) => {
    try {
      const params: { domain?: string; prefetch: boolean } = { prefetch: true };
      if (domain) params.domain = domain;
      const res = await apiClient.post<{ data: StartSessionResponse | null }>("/sessions/start", params);
      if (res.data.data) {
        const normalized = normalizePassage(res.data.data);
        set({
          passage: normalized,
          passageDomain: domain ?? null,
        });
      } else {
        set({
          passage: null,
          passageDomain: null,
        });
      }
    } catch {
      // Silently fail prefetch
      set({
        passage: null,
        passageDomain: null,
      });
    }
  },

  markReadingDone: (elapsedMs, timeSpentMs) => {
    set({ elapsedMs, timeSpentMs: timeSpentMs ?? elapsedMs, phase: "mcq" });
  },

  submitAnswer: (response) => {
    set((state) => {
      const existingIdx = state.responses.findIndex((r) => r.question_id === response.question_id);
      let nextResponses = [...state.responses];
      if (existingIdx > -1) {
        nextResponses[existingIdx] = response;
      } else {
        nextResponses.push(response);
      }
      return { responses: nextResponses };
    });
  },

  submitSession: async () => {
    const { passage, config, elapsedMs, timeSpentMs, responses, readingStartedAt } = get();
    if (!passage || !config) return;

    set({ isSubmitting: true, error: null });
    try {
      const payload: SessionSubmitPayload = {
        passage_id: passage.passage.id,
        target_wpm: config.target_wpm,
        elapsed_ms: elapsedMs,
        started_at: new Date(readingStartedAt ?? Date.now()).toISOString(),
        chunk_size: config.chunk_size,
        fading_used: config.fading_enabled,
        guide_used: config.guide_enabled,
        timezone_offset: new Date().getTimezoneOffset(),
        time_spent_ms: timeSpentMs,
        responses,
      };
      const res = await apiClient.post<{ data: SessionResult }>("/sessions", payload);
      set({ result: res.data.data, phase: "results", isSubmitting: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit session";
      set({ error: message, isSubmitting: false });
    }
  },

  resetSession: () =>
    set({
      phase: "idle",
      passage: null,
      passageDomain: null,
      config: null,
      readingStartedAt: null,
      elapsedMs: 0,
      timeSpentMs: 0,
      responses: [],
      result: null,
      isSubmitting: false,
      error: null,
    }),

  setError: (error) => set({ error }),
}));
