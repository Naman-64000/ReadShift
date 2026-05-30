/**
 * server/src/services/dashboardService.ts
 */

import { prisma } from "../lib/prisma.js";
import type { DashboardSummary } from "./dashboardService.types.js";

export const dashboardService = {
  async buildSummary(userId: string): Promise<DashboardSummary> {
    const [sessions, calibrations, user] = await Promise.all([
      prisma.session.findMany({
        where: { user_id: userId },
        orderBy: { completed_at: "desc" },
        take: 100,
        select: {
          actual_wpm: true, comprehension: true, domain: true,
          level: true, completed_at: true, elapsed_ms: true,
        },
      }),
      prisma.calibration.findMany({
        where: { user_id: userId },
        orderBy: { recorded_at: "desc" },
        take: 3,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, streak_days: true },
      }),
    ]);

    const total = await prisma.session.count({ where: { user_id: userId } });

    // Current WPM = avg of last 3 sessions
    const last3 = sessions.slice(0, 3);
    const current_wpm = last3.length
      ? Math.round(last3.reduce((s, x) => s + x.actual_wpm, 0) / last3.length)
      : 0;

    // Baseline WPM = avg of last 3 calibrations
    const baseline_wpm = calibrations.length
      ? Math.round(calibrations.reduce((s, x) => s + x.wpm, 0) / calibrations.length)
      : current_wpm;

    // Avg comprehension as 0-100
    const avg_comprehension = sessions.length
      ? Math.round((sessions.reduce((s, x) => s + x.comprehension, 0) / (sessions.length * 3)) * 100)
      : 0;

    const streak_days = user?.streak_days ?? 0;
    const current_level = (user?.level ?? 1) as 1 | 2 | 3 | 4;

    // Domain accuracy
    const domainMap = new Map<string, { correct: number; total: number }>();
    sessions.forEach((s) => {
      const cur = domainMap.get(s.domain) ?? { correct: 0, total: 0 };
      domainMap.set(s.domain, {
        correct: cur.correct + s.comprehension,
        total: cur.total + 3,
      });
    });
    const domain_accuracy = Array.from(domainMap.entries()).map(([domain, v]) => ({
      domain: domain as never,
      accuracy: Math.round((v.correct / v.total) * 100),
      sessions: sessions.filter((s) => s.domain === domain).length,
    }));

    // Weak Domain Detection: >10% below average accuracy + at least 5 sessions
    const weak_domains = domain_accuracy
      .filter((d) => d.sessions >= 5 && d.accuracy < avg_comprehension - 10)
      .map((d) => d.domain);

    // Recommended WPM
    // If user is newly calibrated or just recalibrated, start from baseline.
    const allGood = last3.length === 3 && last3.every((s) => s.comprehension >= 2);
    const latest_session_date = sessions[0]?.completed_at?.getTime() ?? 0;
    const latest_calib_date = calibrations[0]?.recorded_at?.getTime() ?? 0;
    const just_recalibrated = latest_calib_date > latest_session_date;

    const raw_recommended = (sessions.length === 0 || just_recalibrated)
      ? (calibrations.length > 0 ? Math.round((baseline_wpm + 20) / 10) * 10 : 220)
      : allGood
        ? Math.round((current_wpm + 25) / 10) * 10
        : Math.round(current_wpm / 10) * 10;
        
    const recommended_wpm = Math.min(500, raw_recommended);

    // Recommended domain = weakest domain if any, otherwise random from preferred
    const recommended_domain = weak_domains.length
      ? (domain_accuracy
          .filter((d) => weak_domains.includes(d.domain))
          .sort((a, b) => a.accuracy - b.accuracy)[0]?.domain ?? null)
      : null;

    // WPM trend for chart (last 30 sessions)
    const wpm_trend = [...sessions].slice(0, 30).reverse().map((s) => ({
      date: s.completed_at.toISOString(),
      wpm: s.actual_wpm,
      comprehension: s.comprehension,
    }));

    // ── ADVANCED PERFORMANCE DIAGNOSTICS & HEATMAPS ──────────────────────────────
    const DOMAINS = ["business", "science", "history", "abstract", "social"];
    const LEVELS = [1, 2, 3, 4];

    // 1. Overall WPM average
    const overallAvgWpm = sessions.length
      ? Math.round(sessions.reduce((s, x) => s + x.actual_wpm, 0) / sessions.length)
      : 0;

    // 2. WPM Domain Slowdown
    const wpm_slowdown = DOMAINS.map((dom) => {
      const domSessions = sessions.filter((s) => s.domain === dom);
      const avg_wpm = domSessions.length
        ? Math.round(domSessions.reduce((s, x) => s + x.actual_wpm, 0) / domSessions.length)
        : 0;
      const slowdown_pct = overallAvgWpm > 0 && avg_wpm > 0
        ? Math.round(((overallAvgWpm - avg_wpm) / overallAvgWpm) * 100)
        : 0;
      return {
        domain: dom,
        avg_wpm,
        slowdown_pct,
      };
    });

    // 3. WPM vs Comprehension Correlation
    const WPM_RANGES = [
      { label: "Under 200 WPM", min: 0, max: 199 },
      { label: "200-250 WPM", min: 200, max: 249 },
      { label: "250-300 WPM", min: 250, max: 299 },
      { label: "300-350 WPM", min: 300, max: 349 },
      { label: "350-400 WPM", min: 350, max: 399 },
      { label: "400+ WPM", min: 400, max: 9999 },
    ];

    const wpm_comprehension_correlation = WPM_RANGES.map((range) => {
      const rangeSessions = sessions.filter(
        (s) => s.actual_wpm >= range.min && s.actual_wpm <= range.max
      );
      const avg_accuracy = rangeSessions.length
        ? Math.round((rangeSessions.reduce((s, x) => s + x.comprehension, 0) / (rangeSessions.length * 3)) * 100)
        : 0;
      return {
        wpm_range: range.label,
        avg_accuracy,
        session_count: rangeSessions.length,
      };
    });

    // 4. Optimal Sweet Spot Detection
    let sweetSpotRange = "";
    let sweetSpotAccuracy = 0;

    // Check from highest WPM range down to lowest
    for (let i = WPM_RANGES.length - 1; i >= 0; i--) {
      const range = WPM_RANGES[i];
      const data = wpm_comprehension_correlation[i];
      if (data.session_count > 0 && data.avg_accuracy >= 70) {
        sweetSpotRange = range.label;
        sweetSpotAccuracy = data.avg_accuracy;
        break;
      }
    }

    // Fallback: Pick highest accuracy range if none is >= 70%
    if (!sweetSpotRange) {
      let maxAcc = -1;
      let bestIndex = -1;
      wpm_comprehension_correlation.forEach((data, index) => {
        if (data.session_count > 0 && data.avg_accuracy > maxAcc) {
          maxAcc = data.avg_accuracy;
          bestIndex = index;
        }
      });
      if (bestIndex !== -1) {
        sweetSpotRange = WPM_RANGES[bestIndex].label;
        sweetSpotAccuracy = maxAcc;
      }
    }

    let sweet_spot = null;
    if (sweetSpotRange) {
      let description = `Your optimal reading "sweet spot" is ${sweetSpotRange} where you maintain a high ${sweetSpotAccuracy}% comprehension score.`;
      
      const highSpeedCorrelation = wpm_comprehension_correlation.find(
        (c) => (c.wpm_range === "350-400 WPM" || c.wpm_range === "400+ WPM") && c.session_count > 0
      );
      if (highSpeedCorrelation && highSpeedCorrelation.avg_accuracy < 60) {
        description += ` Pushing your speed beyond 350 WPM currently results in a steep accuracy decay to ${highSpeedCorrelation.avg_accuracy}%. Focus on structural skimming to stabilize comprehension at higher WPMs.`;
      } else {
        description += " To push this boundary further, practice Adaptive Pacing (LAAP) drills on science and abstract passages.";
      }

      sweet_spot = {
        wpm_range: sweetSpotRange,
        avg_accuracy: sweetSpotAccuracy,
        description,
      };
    }

    // 5. Domain vs Level Performance Heatmap
    const heatmap_data: { domain: string; level: number; avg_accuracy: number; avg_wpm: number; session_count: number; }[] = [];

    DOMAINS.forEach((dom) => {
      LEVELS.forEach((lvl) => {
        const cellSessions = sessions.filter((s) => s.domain === dom && s.level === lvl);
        const avg_accuracy = cellSessions.length
          ? Math.round((cellSessions.reduce((s, x) => s + x.comprehension, 0) / (cellSessions.length * 3)) * 100)
          : 0;
        const avg_wpm = cellSessions.length
          ? Math.round(cellSessions.reduce((s, x) => s + x.actual_wpm, 0) / cellSessions.length)
          : 0;
        heatmap_data.push({
          domain: dom,
          level: lvl,
          avg_accuracy,
          avg_wpm,
          session_count: cellSessions.length,
        });
      });
    });

    return {
      current_wpm,
      baseline_wpm,
      current_level,
      streak_days,
      sessions_completed: total,
      avg_comprehension,
      wpm_trend,
      domain_accuracy,
      weak_domains,
      recommended_wpm,
      recommended_domain,
      wpm_slowdown,
      wpm_comprehension_correlation,
      heatmap_data,
      sweet_spot,
    };
  },
};
