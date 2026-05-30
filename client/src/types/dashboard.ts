/**
 * client/src/types/dashboard.ts
 *
 * TypeScript interfaces for dashboard data shapes returned by
 * GET /api/dashboard/summary.
 */

import type { Domain } from "./user";

export interface WpmDataPoint {
  date: string; // ISO date string
  wpm: number;
  comprehension: number;
}

export interface DomainAccuracy {
  domain: Domain;
  accuracy: number; // 0–100 percentage
  sessions: number;
}

export interface WpmSlowdown {
  domain: Domain;
  avg_wpm: number;
  slowdown_pct: number;
}

export interface WpmComprehensionCorrelation {
  wpm_range: string;
  avg_accuracy: number;
  session_count: number;
}

export interface HeatmapCell {
  domain: Domain;
  level: number;
  avg_accuracy: number;
  avg_wpm: number;
  session_count: number;
}

export interface SweetSpot {
  wpm_range: string;
  avg_accuracy: number;
  description: string;
}

export interface DashboardSummary {
  current_wpm: number;
  baseline_wpm: number;
  current_level: 1 | 2 | 3 | 4;
  streak_days: number;
  sessions_completed: number;
  avg_comprehension: number;       // 0–100 percentage
  wpm_trend: WpmDataPoint[];       // Last 30 sessions
  domain_accuracy: DomainAccuracy[];
  weak_domains: Domain[];
  recommended_wpm: number;
  recommended_domain: Domain | null;
  wpm_slowdown: WpmSlowdown[];
  wpm_comprehension_correlation: WpmComprehensionCorrelation[];
  heatmap_data: HeatmapCell[];
  sweet_spot: SweetSpot | null;
}
