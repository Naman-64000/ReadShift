/**
 * server/src/controllers/sessions.ts
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sessionService } from "../services/sessionService.js";
import { AppError } from "../types/index.js";
import { prisma } from "../lib/prisma.js";

const StartSchema = z.object({
  domain: z.enum(["business", "science", "history", "abstract", "social"]).optional(),
});

const StartSessionResponseSchema = z.object({
  passage: z.object({
    id: z.string().uuid(),
    body: z.string().min(50),
    word_count: z.number().int().positive(),
    domain: z.enum(["business", "science", "history", "abstract", "social"]),
    generated_by: z.string().min(1),
    source: z.string().min(1),
    status: z.enum(["draft", "ready", "flagged", "retired"]),
    quality_score: z.number().int().nullable().optional(),
    topic_key: z.string().nullable().optional(),
    hash: z.string().nullable().optional(),
    flagged: z.boolean(),
    created_at: z.date(),
  }),
  questions: z.array(
    z.object({
      id: z.string().uuid(),
      passage_id: z.string().uuid(),
      type: z.enum(["main_idea", "inference", "vocab"]),
      stem: z.string().min(10),
      options: z.array(z.string().min(1)).length(4),
    })
  ).length(3),
});

const SubmitSchema = z.object({
  passage_id: z.string().uuid(),
  target_wpm: z.number().int().positive(),
  elapsed_ms: z.number().int().positive(),
  started_at: z.string(),
  chunk_size: z.number().int().min(1),
  fading_used: z.boolean(),
  guide_used: z.boolean(),
  timezone_offset: z.number().int().optional(),
  responses: z.array(z.object({
    question_id: z.string().uuid(),
    selected_index: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    time_taken_ms: z.number().int().nonnegative(),
  })).min(0).max(5),
});

export async function startSession(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = StartSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const passage = await sessionService.pickPassage(
      req.auth!.userId,
      parsed.data.domain
    );
    const { questions, ...passageOnly } = passage;
    const data = StartSessionResponseSchema.parse({ passage: passageOnly, questions });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function submitSession(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const result = await sessionService.createSession(req.auth!.userId, parsed.data);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { user_id: req.auth!.userId },
        orderBy: { completed_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.session.count({ where: { user_id: req.auth!.userId } }),
    ]);
    res.json({ success: true, data: { sessions, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

export async function getSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, user_id: req.auth!.userId },
      include: { responses: true },
    });
    if (!session) throw new AppError("NOT_FOUND", "Session not found", 404);
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
}

export async function markPassageSeen(req: Request, res: Response, next: NextFunction) {
  try {
    const { passage_id } = req.body;
    if (!passage_id) throw new AppError("VALIDATION_ERROR", "passage_id is required", 400);

    const alreadySeen = await prisma.userPassageSeen.findUnique({
      where: { user_id_passage_id: { user_id: req.auth!.userId, passage_id } },
    });
    if (!alreadySeen) {
      await prisma.userPassageSeen.create({ data: { user_id: req.auth!.userId, passage_id } });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getDomainStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;

    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    const [seen, activeAssignments] = await Promise.all([
      prisma.userPassageSeen.findMany({
        where: { user_id: userId },
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

    // NOTE: No level filter — matches pickPassage behavior.
    // All passages are accessible regardless of user level at this stage.
    const baseWhere = {
      flagged: false,
      status: "ready" as const,
      id: { notIn: excludedIds.length ? excludedIds : ["none"] },
    };

    const domains = ["business", "science", "history", "abstract", "social"];
    const statusMap: Record<string, number> = {};

    for (const d of domains) {
      const count = await prisma.passage.count({
        where: {
          ...baseWhere,
          domain: d as any,
        },
      });
      statusMap[d] = count;
    }

    res.json({ success: true, data: statusMap });
  } catch (err) { next(err); }
}

export async function getUserHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const history = await prisma.userPassageSeen.findMany({
      where: { user_id: userId },
      orderBy: { seen_at: "desc" },
      include: {
        passage: {
          include: {
            sessions: {
              where: { user_id: userId },
              orderBy: { completed_at: "desc" },
              take: 1,
              include: {
                responses: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    const data = history.map((h) => {
      const sess = h.passage.sessions[0] ?? null;
      return {
        id: h.id,
        seen_at: h.seen_at,
        passage: {
          id: h.passage.id,
          body: h.passage.body,
          domain: h.passage.domain,
          topic_key: h.passage.topic_key,
          word_count: h.passage.word_count,
        },
        session: sess
          ? {
              id: sess.id,
              actual_wpm: sess.actual_wpm,
              comprehension: sess.comprehension,
              completed_at: sess.completed_at,
              mcqs_enabled: sess.responses.length > 0,
            }
          : null,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}


