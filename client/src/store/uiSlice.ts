/**
 * client/src/store/uiSlice.ts
 * Zustand slice for global transient UI state.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";

export type ThemeMode = "dark" | "light";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  durationMs: number;
}

interface UIState {
  isFullscreen: boolean;
  theme: ThemeMode;
  toasts: Toast[];
  modalOpen: string | null;

  setFullscreen: (value: boolean) => void;
  setTheme: (value: ThemeMode) => void;
  toggleTheme: () => void;
  addToast: (toast: Omit<Toast, "id" | "durationMs"> & { durationMs?: number }) => string;
  removeToast: (id: string) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem("readshift_theme");
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export const useUIStore = create<UIState>((set) => ({
  isFullscreen: false,
  theme: getInitialTheme(),
  toasts: [],
  modalOpen: null,

  setFullscreen: (value) => set({ isFullscreen: value }),
  setTheme: (value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("readshift_theme", value);
    }
    set({ theme: value });
  },
  toggleTheme: () =>
    set((state) => {
      const nextTheme: ThemeMode = state.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem("readshift_theme", nextTheme);
      }
      return { theme: nextTheme };
    }),

  addToast: (toast) => {
    const id = uid();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, durationMs: toast.durationMs ?? 4000 }],
    }));
    return id;
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  openModal: (id) => set({ modalOpen: id }),
  closeModal: () => set({ modalOpen: null }),
}));
