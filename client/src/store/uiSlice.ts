/**
 * client/src/store/uiSlice.ts
 * Zustand slice for global transient UI state.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  durationMs: number;
}

interface UIState {
  isFullscreen: boolean;
  toasts: Toast[];
  modalOpen: string | null;

  setFullscreen: (value: boolean) => void;
  addToast: (toast: Omit<Toast, "id" | "durationMs"> & { durationMs?: number }) => string;
  removeToast: (id: string) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isFullscreen: false,
  toasts: [],
  modalOpen: null,

  setFullscreen: (value) => set({ isFullscreen: value }),

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
