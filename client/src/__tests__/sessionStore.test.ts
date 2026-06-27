/**
 * client/src/__tests__/sessionStore.test.ts
 *
 * Unit tests for the Zustand session state machine.
 * These tests run entirely in jsdom with no network calls.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSessionStore } from "../store/sessionSlice";

// Mock the apiClient so no real network calls happen
vi.mock("@/lib/apiClient", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from "@/lib/apiClient";

const mockPassageResponse = {
  data: {
    data: {
      id: "passage-1",
      body: "Test passage body.",
      word_count: 3,
      domain: "science_and_technology",
      generated_by: "gemini",
      flagged: false,
      title: "Test Passage",
      paragraph_roadmaps: [],
      created_at: new Date().toISOString(),
      questions: [],
    },
  },
};

describe("sessionSlice — Zustand state machine", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSessionStore.setState({
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
    });
    vi.clearAllMocks();
  });

  it("starts in idle phase", () => {
    const { phase } = useSessionStore.getState();
    expect(phase).toBe("idle");
  });

  it("transitions to reading phase after startSession succeeds", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockPassageResponse);

    await useSessionStore.getState().startSession({
      target_wpm: 200,
      chunk_size: 3,
      fading_enabled: false,
      guide_enabled: false,
    });

    const { phase, passage } = useSessionStore.getState();
    expect(phase).toBe("reading");
    expect(passage).not.toBeNull();
    expect(passage?.passage.id).toBe("passage-1");
  });

  it("transitions to idle with error when startSession fails", async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

    await useSessionStore.getState().startSession({
      target_wpm: 200,
      chunk_size: 3,
      fading_enabled: false,
      guide_enabled: false,
    });

    const { phase, error } = useSessionStore.getState();
    expect(phase).toBe("idle");
    expect(error).toBe("Network error");
  });

  it("markReadingDone transitions to mcq phase", () => {
    useSessionStore.setState({ phase: "reading" });
    useSessionStore.getState().markReadingDone(30000, 28000);

    const { phase, elapsedMs, timeSpentMs } = useSessionStore.getState();
    expect(phase).toBe("mcq");
    expect(elapsedMs).toBe(30000);
    expect(timeSpentMs).toBe(28000);
  });

  it("submitAnswer appends responses and deduplicates by question_id", () => {
    useSessionStore.getState().submitAnswer({ question_id: "q1", selected_index: 0, time_taken_ms: 1000 });
    useSessionStore.getState().submitAnswer({ question_id: "q1", selected_index: 2, time_taken_ms: 2000 });
    useSessionStore.getState().submitAnswer({ question_id: "q2", selected_index: 1, time_taken_ms: 500 });

    const { responses } = useSessionStore.getState();
    expect(responses).toHaveLength(2);
    expect(responses.find((r) => r.question_id === "q1")?.selected_index).toBe(2); // updated
  });

  it("resetSession returns to initial state", () => {
    useSessionStore.setState({ phase: "results", error: "some error", elapsedMs: 5000 });
    useSessionStore.getState().resetSession();

    const { phase, error, elapsedMs } = useSessionStore.getState();
    expect(phase).toBe("idle");
    expect(error).toBeNull();
    expect(elapsedMs).toBe(0);
  });
});
