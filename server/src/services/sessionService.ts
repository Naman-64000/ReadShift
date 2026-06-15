/**
 * server/src/services/sessionService.ts
 */

import { prisma } from "../lib/prisma.js";
import { AppError } from "../types/index.js";
import crypto from "crypto";
import { staticVault } from "../data/staticVault.js";
import { buildPassageTitle, evaluatePassageQuality } from "./passageQualityService.js";
import { aiService } from "./aiService.js";

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
  async pickPassage(userId: string, domain?: string, prefetch?: boolean, passageId?: string) {

    console.log(`[pickPassage] userId: ${userId}, domain: ${domain}, prefetch: ${prefetch}, passageId: ${passageId}`);

    if (passageId) {
      const explicitPassage = await prisma.passage.findUnique({
        where: { id: passageId },
        include: {
          questions: { select: { id: true, passage_id: true, type: true, stem: true, options: true } },
        },
      });
      if (!explicitPassage) throw new AppError("NOT_FOUND", "Requested passage not found", 404);

      if (!prefetch) {
        const alreadySeen = await prisma.userPassageSeen.findUnique({
          where: { user_id_passage_id: { user_id: userId, passage_id: explicitPassage.id } },
        });
        if (!alreadySeen) {
          await prisma.userPassageSeen.create({ data: { user_id: userId, passage_id: explicitPassage.id } });
        } else if (alreadySeen.reallowed) {
          await prisma.userPassageSeen.update({
            where: { id: alreadySeen.id },
            data: { reallowed: false, seen_at: new Date() },
          });
        }

        await prisma.passageAssignment.create({
          data: {
            user_id: userId,
            passage_id: explicitPassage.id,
            domain_requested: (explicitPassage.domain as any) ?? null,
          },
        });
      }

      if (explicitPassage.questions) {
        const q = [...explicitPassage.questions];
        for (let i = q.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [q[i], q[j]] = [q[j], q[i]];
        }
        explicitPassage.questions = q;
      }
      return explicitPassage;
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    const [seen, activeAssignments] = await Promise.all([
      prisma.userPassageSeen.findMany({
        where: { user_id: userId, reallowed: false },
        select: { passage_id: true },
      }),
      prisma.passageAssignment.findMany({
        where: {
          user_id: userId,
          assigned_at: { gte: twoHoursAgo },
        },
        select: { passage_id: true },
      }),
    ]);
    const excludedIds = Array.from(new Set([
      ...seen.map((s) => s.passage_id),
      ...activeAssignments.map((a) => a.passage_id),
    ]));

    // NOTE: Level filtering is intentionally omitted here.
    // All AI-generated passages are CAT/GMAT level content (originally seeded as level 3-4).
    // The `level` field is preserved for future adaptive difficulty features,
    // but we do not gate the passage pool by user level at this stage.
    const baseWhere = {
      flagged: false,
      status: "ready" as const,
      id: { notIn: excludedIds.length ? excludedIds : ["none"] },
    };

    let chosenDomain = domain;
    if (!chosenDomain) {
      // Query user preferences to respect their selected settings domains
      const userPrefs = await prisma.userPreferences.findUnique({
        where: { user_id: userId },
      });
      const allowedDomains = userPrefs?.domains && userPrefs.domains.length > 0
        ? userPrefs.domains
        : ["business", "science", "history", "abstract", "social"];
      
      // Shuffle allowed domains randomly using unbiased Fisher-Yates algorithm
      const shuffled = [...allowedDomains];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Select the first domain in our shuffled list that has unseen ready passages
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
      
      let vaultCandidates = staticVault.filter((p) => p.domain === chosenDomain);
      if (!vaultCandidates.length) {
        vaultCandidates = [...staticVault];
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
              generated_by: "static_vault",
              source: "static_vault",
              status: "ready",
              title: buildPassageTitle(vp.topic_key),
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

        if (!excludedIds.includes(dbPassage.id)) {
          passage = dbPassage;
          break;
        }
      }
    }

    // ── Second Failover: On-the-Fly Dynamic Generation ──
    if (!passage) {
      if (prefetch) {
        console.log(`[pickPassage] Pool exhausted during prefetch, skipping dynamic generation.`);
        return null;
      }
      console.log(`[pickPassage] All pools and vault exhausted. Generating a brand-new passage dynamically...`);
      
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { preferences: true },
        });

        const validDomains = ["business", "science", "history", "abstract", "social"];
        let domainToGenerate = chosenDomain;
        if (!domainToGenerate || !validDomains.includes(domainToGenerate)) {
          const allowedDomains = user?.preferences?.domains && user.preferences.domains.length > 0
            ? user.preferences.domains
            : validDomains;
          const randomIndex = Math.floor(Math.random() * allowedDomains.length);
          domainToGenerate = allowedDomains[randomIndex];
        }
        const userApiKey = user?.preferences?.gemini_api_key || null;

        const aiPassage = await aiService.generatePassage(domainToGenerate, userApiKey);
        const hash = crypto.createHash("sha256").update(aiPassage.body).digest("hex");
        const generatedQuestions = await aiService.generateQuestions(aiPassage.body, userApiKey);
        
        const quality = await evaluatePassageQuality({
          body: aiPassage.body,
          word_count: aiPassage.word_count,
          questionCount: generatedQuestions.length,
          source: user?.email || "gemini",
          title: aiPassage.title,
        }, userApiKey);

        passage = await prisma.passage.create({
          data: {
            body: aiPassage.body,
            word_count: aiPassage.word_count,
            domain: aiPassage.domain as any,
            generated_by: aiPassage.generated_by,
            source: user?.email || "gemini",
            status: quality.status === "ready" ? "ready" : "draft",
            quality_score: quality.quality_score,
            title: aiPassage.title || quality.title,
            topic_key: quality.topic_key,
            hash,
            paragraph_roadmaps: aiPassage.paragraph_roadmaps,
            skim_highlights: aiPassage.skim_highlights,
            questions: {
              create: generatedQuestions.map((q) => ({
                type: q.type as any,
                stem: q.stem,
                options: q.options,
                correct_index: q.correct_index,
                explanations: q.explanations,
              })),
            },
          },
          include: {
            questions: {
              select: { id: true, passage_id: true, type: true, stem: true, options: true },
            },
          },
        });
        
        console.log(`[pickPassage] Brand-new passage dynamically generated and saved: ID: ${passage.id}, Title: "${passage.title}"`);
      } catch (genError) {
        console.error(`[pickPassage] Dynamic generation failed:`, genError);
        throw new AppError("GENERATION_FAILED", "Failed to generate a new passage on the fly", 500);
      }
    }

    if (!passage) {
      throw new AppError("POOL_EXHAUSTED", `No passages available in any pool`, 404);
    }

    if (!prefetch) {
      // Record the view atomically (only for newly assigned, non-recycled passages)
      const alreadySeen = await prisma.userPassageSeen.findUnique({
        where: { user_id_passage_id: { user_id: userId, passage_id: passage.id } },
      });
      if (!alreadySeen) {
        await prisma.userPassageSeen.create({ data: { user_id: userId, passage_id: passage.id } });
      } else if (alreadySeen.reallowed) {
        await prisma.userPassageSeen.update({
          where: { id: alreadySeen.id },
          data: { reallowed: false, seen_at: new Date() },
        });
      }

      await prisma.passageAssignment.create({
        data: {
          user_id: userId,
          passage_id: passage.id,
          domain_requested: (domain as any) ?? null,
        },
      });
    }

    // Shuffle GMAT questions randomly using Fisher-Yates shuffle
    if (passage && passage.questions) {
      const q = [...passage.questions];
      for (let i = q.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
      }
      passage.questions = q;
    }

    return passage;
  },

  async createSession(userId: string, payload: {
    passage_id: string;
    target_wpm: number;
    elapsed_ms: number;
    started_at: string;
    chunk_size: number;
    fading_used: boolean;
    guide_used: boolean;
    timezone_offset?: number;
    time_spent_ms?: number;
    responses: Array<{ question_id: string; selected_index: number; time_taken_ms: number }>;
  }) {
    const passage = await prisma.passage.findUnique({
      where: { id: payload.passage_id },
      include: { questions: { select: { id: true, correct_index: true } } },
    });
    if (!passage) throw new AppError("NOT_FOUND", "Passage not found", 404);

    // Timing validation & safety check (Issue #9)
    if (!payload.elapsed_ms || payload.elapsed_ms < 5000) {
      throw new AppError("VALIDATION_ERROR", "Reading duration too short to be valid", 400);
    }

    // Verify client timing against server elapsed time (Issue #2)
    // The total real-world elapsed time since starting the session must be at least as long
    // as the active reading duration (allowing a 5-second buffer for clock skew or network lag).
    // Note: The user may spend additional time on the "Ready to Begin" overlay, structural skimming,
    // and answering the MCQs, so serverElapsedMs can be significantly larger than payload.elapsed_ms.
    const serverElapsedMs = Date.now() - new Date(payload.started_at).getTime();
    if (serverElapsedMs < payload.elapsed_ms - 5000) {
      throw new AppError("VALIDATION_ERROR", "Reading session duration is invalid.", 400);
    }

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
    const { session } = await prisma.$transaction(async (tx) => {
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

      // Fetch user data for streak management
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { streak_days: true, last_session_at: true },
      });

      // Streak management (Issue #14)
      let newStreak = user?.streak_days ?? 0;
      const now = new Date();
      const lastSession = user?.last_session_at;

      if (!lastSession) {
        newStreak = 1;
      } else {
        const offset = payload.timezone_offset ?? 0;
        const lastDate = new Date(lastSession.getTime() - offset * 60_000).toISOString().slice(0, 10);
        const todayDate = new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
        const yesterday = new Date(now.getTime() - offset * 60_000);
        yesterday.setDate(yesterday.getDate() - 1);
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

      if (payload.time_spent_ms !== undefined) {
        await tx.userPassageSeen.updateMany({
          where: {
            user_id: userId,
            passage_id: payload.passage_id,
          },
          data: {
            time_spent_ms: payload.time_spent_ms,
          },
        });
      }

      return { session: sess };
    });

    const responses = await prisma.response.findMany({
      where: { session_id: session.id },
      include: { question: { select: { correct_index: true, explanations: true } } },
    });

    const responsesWithCorrect = responses.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      question_id: r.question_id,
      selected_index: r.selected_index,
      is_correct: r.is_correct,
      time_taken_ms: r.time_taken_ms,
      correct_index: r.question.correct_index,
      explanations: r.question.explanations,
    }));

    return { session, responses: responsesWithCorrect, actual_wpm, comprehension };
  },
};
