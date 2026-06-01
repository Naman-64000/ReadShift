/**
 * server/src/services/dashboardService.types.ts
 * Type re-export so dashboardService.ts stays clean.
 */

export interface WpmDataPoint { date: string; wpm: number; comprehension: number; accuracy: number; }
export interface DomainAccuracy { domain: string; accuracy: number; sessions: number; }

export interface WpmSlowdown {
  domain: string;
  avg_wpm: number;
  slowdown_pct: number; // positive = slower, negative = faster
}

export interface WpmComprehensionCorrelation {
  wpm_range: string;
  avg_accuracy: number;
  session_count: number;
}

export interface HeatmapCell {
  domain: string;
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
  streak_days: number;
  sessions_completed: number;
  avg_comprehension: number;
  wpm_trend: WpmDataPoint[];
  domain_accuracy: DomainAccuracy[];
  weak_domains: string[];
  recommended_wpm: number;
  recommended_domain: string | null;
  wpm_slowdown: WpmSlowdown[];
  wpm_comprehension_correlation: WpmComprehensionCorrelation[];
  heatmap_data: HeatmapCell[];
  sweet_spot: SweetSpot | null;
}
