/**
 * client/src/store/dashboardSlice.ts
 * Zustand slice for dashboard summary data with stale-while-revalidate caching.
 */

import { create } from "zustand";
import type { DashboardSummary } from "@/types";
import { apiClient } from "@/lib/apiClient";

const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes

interface DashboardState {
  summary: DashboardSummary | null;
  isLoading: boolean;
  lastFetchedAt: number | null;
  error: string | null;

  fetchSummary: (force?: boolean) => Promise<void>;
  invalidate: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  summary: null,
  isLoading: false,
  lastFetchedAt: null,
  error: null,

  fetchSummary: async (force = false) => {
    const { isLoading, lastFetchedAt } = get();
    if (isLoading) return;

    // Skip if data is still fresh and not forced
    const isStale =
      lastFetchedAt === null || Date.now() - lastFetchedAt > STALE_AFTER_MS;
    if (!force && !isStale && get().summary !== null) return;

    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get<{ data: DashboardSummary }>("/dashboard/summary");
      set({ summary: res.data.data, isLoading: false, lastFetchedAt: Date.now() });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard";
      set({ error: message, isLoading: false });
    }
  },

  invalidate: () => set({ lastFetchedAt: null }),
}));
