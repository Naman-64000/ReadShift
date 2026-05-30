/**
 * client/src/store/index.ts
 *
 * Combines all Zustand slice stores into a unified export.
 *
 * What this file will do:
 *  - Re-export each individual slice hook for named imports.
 *  - Optionally compose slices into a single root store via
 *    Zustand's `create` with slice pattern (if a combined store is needed).
 *
 * Usage:
 *   import { useUserStore } from '@/store';
 *   import { useSessionStore } from '@/store';
 */

export { useUserStore } from "./userSlice";
export { useSessionStore } from "./sessionSlice";
export { useDashboardStore } from "./dashboardSlice";
export { useUIStore } from "./uiSlice";
