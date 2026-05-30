/**
 * server/src/services/sessionService.ts
 */

import { prisma } from "../lib/prisma.js";
import { AppError } from "../types/index.js";
import crypto from "crypto";
import { staticVault } from "../data/staticVault.js";

function weightedRandomPick<T>(items: T[], getWeight: (item: T) => number): T | null {
  if (!items.length) return null;
  const weights = items.map((item) => Math.max(0.01, getWeight(item)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export const sessionService = {
  /** Pick an unseen passage for this user, atomically record the view */
  async pickPassage(userId: string, domain?: string, level?: number) {
    // 1. Get user's current level if not provided
    let targetLevel = level;
    if (!targetLevel) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { level: true },
      });
      targetLevel = user?.level ?? 1;
    }

    console.log(`[pickPassage] userId: ${userId}, domain: ${domain}, targetLevel: ${targetLevel}`);

    const seen = await prisma.userPassageSeen.findMany({
      where: { user_id: userId },
      select: { passage_id: true },
    });
    const seenIds = seen.map((s) => s.passage_id);

    const baseWhere = {
      flagged: false,
      status: "ready" as const,
      id: { notIn: seenIds.length ? seenIds : ["none"] },
      level: targetLevel,
    };

    let chosenDomain = domain;
    if (!chosenDomain) {
      const allDomains = ["business", "science", "history", "abstract", "social"];
      // Shuffle domains randomly to try them in a random order with equal probability
      const shuffled = [...allDomains].sort(() => Math.random() - 0.5);
      
      // Select the first domain in our shuffled list that has unseen ready passages at this level
      for (const d of shuffled) {
        const count = await prisma.passage.count({
          where: {
            ...baseWhere,
            domain: d as any,
          },
        });
        if (count > 0) {
          chosenDomain = d;
          break;
        }
      }
      
      // Fallback if all domains are fully exhausted/seen: pick the first shuffled domain
      if (!chosenDomain) {
        chosenDomain = shuffled[0];
      }
    }

    let candidates = await prisma.passage.findMany({
      where: {
        ...baseWhere,
        ...(chosenDomain ? { domain: chosenDomain as any } : {}),
      },
      take: 120,
      orderBy: { created_at: "desc" },
      include: {
        questions: {
          select: { id: true, passage_id: true, type: true, stem: true, options: true },
        },
      },
    });

    // Fallback: if requested domain has no unseen ready passages at this level,
    // broaden to any domain at the same level.
    if (!candidates.length && chosenDomain) {
      candidates = await prisma.passage.findMany({
        where: baseWhere,
        take: 120,
        orderBy: { created_at: "desc" },
        include: {
          questions: {
            select: { id: true, passage_id: true, type: true, stem: true, options: true },
          },
        },
      });
    }

    let passage: any = null;

    if (candidates.length > 0) {
      const recentSessions = await prisma.session.findMany({
        where: { user_id: userId },
        orderBy: { completed_at: "desc" },
        take: 5,
        select: { passage_id: true },
      });
      const recentPassageIds = recentSessions.map((s) => s.passage_id);

      const recentTopicKeys = new Set(
        candidates
          .filter((p) => recentPassageIds.includes(p.id))
          .map((p) => p.topic_key)
          .filter((k): k is string => Boolean(k))
      );

      const newestTime = candidates[0]?.created_at.getTime() ?? Date.now();
      const oldestTime = candidates[candidates.length - 1]?.created_at.getTime() ?? newestTime;
      const ageRange = Math.max(1, newestTime - oldestTime);

      passage = weightedRandomPick(candidates, (candidate) => {
        const freshness = 0.7 + ((candidate.created_at.getTime() - oldestTime) / ageRange) * 0.6;
        const diversityPenalty = candidate.topic_key && recentTopicKeys.has(candidate.topic_key) ? 0.35 : 1;
        return freshness * diversityPenalty;
      });
    }

    // ── First Failover: Try the Static local Passage Vault ──
    if (!passage) {
      console.log(`[pickPassage] Unseen active DB pool exhausted. Triggering Static Vault Fallback...`);
      
      let vaultCandidates = staticVault.filter((p) => p.level === targetLevel && p.domain === chosenDomain);
      if (!vaultCandidates.length) {
        vaultCandidates = staticVault.filter((p) => p.level === targetLevel);
      }

      for (const vp of vaultCandidates) {
        const hash = crypto.createHash("sha256").update(vp.body).digest("hex");
        
        let dbPassage = await prisma.passage.findUnique({
          where: { hash },
          include: {
            questions: {
              select: { id: true, passage_id: true, type: true, stem: true, options: true },
            },
          },
        });

        // Dynamic, atomic seed of static vault passage if not already in DB
        if (!dbPassage) {
          console.log(`[pickPassage] Dynamic seeding static vault passage: "${vp.topic_key}"`);
          dbPassage = await prisma.passage.create({
            data: {
              body: vp.body,
              word_count: vp.body.trim().split(/\s+/).filter(Boolean).length,
              domain: vp.domain as any,
              level: vp.level,
              generated_by: "static_vault",
              source: "static_vault",
              status: "ready",
              hash,
              questions: {
                create: vp.questions.map((q) => ({
                  type: q.type,
                  stem: q.stem,
                  options: q.options,
                  correct_index: q.correct_index,
                })),
              },
            },
            include: {
              questions: {
                select: { id: true, passage_id: true, type: true, stem: true, options: true },
              },
            },
          });
        }

        if (!seenIds.includes(dbPassage.id)) {
          passage = dbPassage;
          break;
        }
      }
    }

    // ── Second Failover: Active Recycling of oldest seen passages ──
    if (!passage) {
      console.log(`[pickPassage] All pools exhausted. Triggering Active Recycling Fallback...`);
      
      const oldestSeen = await prisma.userPassageSeen.findFirst({
        where: {
          user_id: userId,
          passage: {
            level: targetLevel,
            flagged: false,
            status: "ready",
          },
        },
        orderBy: { seen_at: "asc" }, // oldest seen first
        select: {
          passage_id: true,
        },
      });

      if (oldestSeen) {
        passage = await prisma.passage.findUnique({
          where: { id: oldestSeen.passage_id },
          include: {
            questions: {
              select: { id: true, passage_id: true, type: true, stem: true, options: true },
            },
          },
        });

        if (passage) {
          console.log(`[pickPassage] Recycling passage ID: ${passage.id}, Topic: ${passage.topic_key}`);
          await prisma.userPassageSeen.update({
            where: { user_id_passage_id: { user_id: userId, passage_id: passage.id } },
            data: { seen_at: new Date() },
          });
        }
      }
    }

    if (!passage) {
      throw new AppError("POOL_EXHAUSTED", `No level ${targetLevel} passages available in any pool`, 404);
    }

    // Record the view atomically (only for newly assigned, non-recycled passages)
    const alreadySeen = await prisma.userPassageSeen.findUnique({
      where: { user_id_passage_id: { user_id: userId, passage_id: passage.id } },
    });
    if (!alreadySeen) {
      await prisma.userPassageSeen.create({ data: { user_id: userId, passage_id: passage.id } });
    }

    await prisma.passageAssignment.create({
      data: {
        user_id: userId,
        passage_id: passage.id,
        domain_requested: (domain as any) ?? null,
        level_requested: targetLevel,
      },
    });

    return passage;
  },

  /** Submit a completed session — server computes WPM, scoring, level check */
  async createSession(userId: string, payload: {
    passage_id: string;
    target_wpm: number;
    elapsed_ms: number;
    started_at: string;
    chunk_size: number;
    fading_used: boolean;
    guide_used: boolean;
    responses: Array<{ question_id: string; selected_index: number; time_taken_ms: number }>;
  }) {
    const passage = await prisma.passage.findUnique({
      where: { id: payload.passage_id },
      include: { questions: { select: { id: true, correct_index: true } } },
    });
    if (!passage) throw new AppError("NOT_FOUND", "Passage not found", 404);

    // Server-side WPM calculation
    const actual_wpm = Math.round((passage.word_count / payload.elapsed_ms) * 60_000);

    // Build correct-index map
    const correctMap = new Map(passage.questions.map((q) => [q.id, q.correct_index]));

    // Evaluate each response
    const evaluatedResponses = payload.responses.map((r) => ({
      ...r,
      is_correct: correctMap.get(r.question_id) === r.selected_index,
    }));

    const comprehension = evaluatedResponses.filter((r) => r.is_correct).length;

    // Write session + responses in one transaction
    const { session, level_up } = await prisma.$transaction(async (tx) => {
      const sess = await tx.session.create({
        data: {
          user_id: userId,
          passage_id: payload.passage_id,
          target_wpm: payload.target_wpm,
          actual_wpm,
          elapsed_ms: payload.elapsed_ms,
          comprehension,
          chunk_size: payload.chunk_size,
          fading_used: payload.fading_used,
          guide_used: payload.guide_used,
          domain: passage.domain,
          level: passage.level,
          started_at: new Date(payload.started_at),
          completed_at: new Date(),
        },
      });

      await tx.response.createMany({
        data: evaluatedResponses.map((r) => ({
          session_id: sess.id,
          question_id: r.question_id,
          selected_index: r.selected_index,
          is_correct: r.is_correct,
          time_taken_ms: r.time_taken_ms,
        })),
      });

      // Level promotion check — 3 consecutive sessions with comprehension ≥ 2 and speed ≥ level threshold
      const recentSessions = await tx.session.findMany({
        where: { user_id: userId },
        orderBy: { completed_at: "desc" },
        take: 3,
        select: { comprehension: true, actual_wpm: true, level: true },
      });

      const isLevelUp =
        recentSessions.length === 3 &&
        recentSessions.every((s) => s.comprehension >= 2) &&
        recentSessions.every((s) => s.actual_wpm >= s.level * 100);

      if (isLevelUp) {
        await tx.user.update({
          where: { id: userId },
          data: { level: { increment: 1 } },
        });
      }

      // Streak management
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { streak_days: true, last_session_at: true },
      });

      let newStreak = user?.streak_days ?? 0;
      const now = new Date();
      const lastSession = user?.last_session_at;

      if (!lastSession) {
        newStreak = 1;
      } else {
        const lastDate = new Date(lastSession).toISOString().slice(0, 10);
        const todayDate = now.toISOString().slice(0, 10);
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().slice(0, 10);

        if (lastDate === yesterdayDate) {
          newStreak += 1;
        } else if (lastDate !== todayDate) {
          // If it wasn't yesterday AND wasn't today, the streak broke
          newStreak = 1;
        }
        // If lastDate === todayDate, newStreak stays the same
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          streak_days: newStreak,
          last_session_at: now,
        },
      });

      return { session: sess, level_up: isLevelUp };
    });

    const responses = await prisma.response.findMany({ where: { session_id: session.id } });

    return { session, responses, actual_wpm, comprehension, level_up };
  },
};
