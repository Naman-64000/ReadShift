/**
 * client/src/types/user.ts
 *
 * TypeScript interfaces for User and UserPreferences data models.
 * Mirrors the Prisma schema — used for API response typing.
 */

export type Domain = "business" | "science" | "history" | "abstract" | "social";
export type ColWidth = "narrow" | "medium" | "wide";

export interface User {
  id: string;
  email: string;
  clerk_id: string;
  is_admin: boolean;
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  chunk_size: 2 | 3;
  fading_enabled: boolean;
  guide_enabled: boolean;
  col_width: ColWidth;
  font_size_px: 10 | 12 | 14 | 16;
  domains: Domain[];
  mcq_timer: number;
  highlight_intensity: "none" | "subtle" | "moderate" | "intense";
  auto_center_scroll: boolean;
  laap_enabled: boolean;
  skim_enabled: boolean;
  mcqs_enabled: boolean;
  progress_bar_enabled: boolean;
  timer_enabled: boolean;
  roadmaps_enabled?: boolean;
  timed_passages_enabled?: boolean;
  gemini_api_key?: string | null;
}

/** Combined user + prefs shape returned by GET /api/users/me */
export interface UserProfile {
  user: User;
  preferences: UserPreferences;
}
