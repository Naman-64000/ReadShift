/**
 * server/src/services/dashboardService.types.ts
 * Type re-export so dashboardService.ts stays clean.
 */

export interface WpmDataPoint { date: string; wpm: number; comprehension: number; }
export interface DomainAccuracy { domain: string; accuracy: number; sessions: number; }

export interface DashboardSummary {
  current_wpm: number;
  baseline_wpm: number;
  current_level: 1 | 2 | 3 | 4;
  streak_days: number;
  sessions_completed: number;
  avg_comprehension: number;
  wpm_trend: WpmDataPoint[];
  domain_accuracy: DomainAccuracy[];
  weak_domains: string[];
  recommended_wpm: number;
  recommended_domain: string | null;
}
