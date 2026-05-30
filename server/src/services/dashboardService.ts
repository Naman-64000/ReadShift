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
        take: 30,
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
    // If user is newly calibrated with no sessions yet, start from baseline.
    const allGood = last3.length === 3 && last3.every((s) => s.comprehension >= 2);
    const recommended_wpm =
      sessions.length === 0
        ? baseline_wpm
        : allGood
          ? current_wpm + 25
          : current_wpm;

    // Recommended domain = weakest domain if any, otherwise random from preferred
    const recommended_domain = weak_domains.length
      ? (domain_accuracy
          .filter((d) => weak_domains.includes(d.domain))
          .sort((a, b) => a.accuracy - b.accuracy)[0]?.domain ?? null)
      : null;

    // WPM trend for chart
    const wpm_trend = [...sessions].reverse().map((s) => ({
      date: s.completed_at.toISOString(),
      wpm: s.actual_wpm,
      comprehension: s.comprehension,
    }));

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
    };
  },
};
