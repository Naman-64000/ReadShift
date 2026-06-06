/**
 * client/src/store/userSlice.ts
 * Zustand slice for authenticated user state and preferences.
 */

import { create } from "zustand";
import type { User, UserPreferences } from "@/types";
import { apiClient } from "@/lib/apiClient";

interface UserState {
  user: User | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updatePreferences: (partial: Partial<UserPreferences>) => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  preferences: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const timezoneOffset = new Date().getTimezoneOffset();
      const res = await apiClient.get<{ data: { user: User; preferences: UserPreferences } }>(
        `/users/me?timezone_offset=${timezoneOffset}`
      );
      set({ user: res.data.data.user, preferences: res.data.data.preferences, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load profile";
      set({ error: message, isLoading: false });
    }
  },

  updatePreferences: async (partial) => {
    const prev = get().preferences;
    // Optimistic update
    if (prev) set({ preferences: { ...prev, ...partial } });
    try {
      const res = await apiClient.patch<{ data: UserPreferences }>("/users/me/preferences", partial);
      set({ preferences: res.data.data });
    } catch (err: unknown) {
      // Rollback on failure
      set({ preferences: prev });
      const message = err instanceof Error ? err.message : "Failed to update preferences";
      set({ error: message });
      throw err;
    }
  },

  clearUser: () => set({ user: null, preferences: null, error: null, isLoading: false }),
}));
