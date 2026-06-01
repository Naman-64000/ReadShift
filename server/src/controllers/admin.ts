import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../types/index.js";

const PassageStatusSchema = z.enum(["draft", "ready", "flagged", "retired"]);

const UpdatePassageSchema = z.object({
  status: PassageStatusSchema.optional(),
  flagged: z.boolean().optional(),
  quality_score: z.number().int().min(0).max(100).nullable().optional(),
});

const UpdateUserAdminSchema = z.object({
  is_admin: z.boolean(),
});

export async function listAdminPassages(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const domain = typeof req.query.domain === "string" ? req.query.domain : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "created_at";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const where = {
      ...(domain ? { domain: domain as any } : {}),
      ...(status ? { status: status as any } : {}),
    };

    let orderBy: any = { created_at: "desc" };
    if (sortBy === "quality_score") {
      orderBy = { quality_score: sortOrder };
    } else if (sortBy === "created_at") {
      orderBy = { created_at: sortOrder };
    } else if (sortBy === "sessions") {
      orderBy = { views: { _count: sortOrder } };
    }

    const [passages, total] = await Promise.all([
      prisma.passage.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { questions: true, views: true } },
        },
      }),
      prisma.passage.count({ where }),
    ]);

    // Map views count to sessions count so client types remain identical
    const mappedPassages = passages.map((p) => ({
      ...p,
      _count: {
        questions: p._count.questions,
        sessions: p._count.views, // Views represent starting/seeing the passage on screen
      },
    }));

    res.json({ success: true, data: { passages: mappedPassages, total, page, limit } });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminPassage(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = UpdatePassageSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);

    const existing = await prisma.passage.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError("NOT_FOUND", "Passage not found", 404);

    const data = {
      ...parsed.data,
      flagged:
        parsed.data.flagged ??
        (parsed.data.status === "flagged" ? true : parsed.data.status ? false : existing.flagged),
    };

    const updated = await prisma.passage.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function listAdminUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        is_admin: true,
        streak_days: true,
        created_at: true,
        _count: { select: { passageViews: true, sessions: true } },
      },
      take: 200,
    });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminUser(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = UpdateUserAdminSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);

    if (req.params.id === req.auth!.userId && parsed.data.is_admin === false) {
      throw new AppError("VALIDATION_ERROR", "You cannot remove your own admin access", 400);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { is_admin: parsed.data.is_admin },
      select: {
        id: true,
        email: true,
        is_admin: true,
        streak_days: true,
        created_at: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function adminSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const [passagesByStatus, passagesByDomain, users] = await Promise.all([
      prisma.passage.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.passage.groupBy({ by: ["domain", "status"], _count: { _all: true } }),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      data: {
        users,
        passages_by_status: passagesByStatus,
        passages_by_domain: passagesByDomain,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /admin/users/:id/seen-passages
 * Returns all passages a user has been shown, with full metadata.
 */
export async function getUserSeenPassages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);

    const [seen, sessions] = await Promise.all([
      prisma.userPassageSeen.findMany({
        where: { user_id: userId },
        orderBy: { seen_at: "desc" },
        include: {
          passage: {
            select: {
              id: true,
              body: true,
              domain: true,
              status: true,
              quality_score: true,
              word_count: true,
              topic_key: true,
              flagged: true,
              source: true,
              created_at: true,
            },
          },
        },
      }),
      prisma.session.findMany({
        where: { user_id: userId },
        select: {
          passage_id: true,
          actual_wpm: true,
          comprehension: true,
        },
      }),
    ]);

    const sessionMap = new Map(sessions.map((s) => [s.passage_id, s]));

    res.json({
      success: true,
      data: {
        user,
        seen_count: seen.length,
        seen_passages: seen.map((s) => {
          const sess = sessionMap.get(s.passage_id);
          return {
            seen_at: s.seen_at,
            passage: s.passage,
            completed_session: sess
              ? {
                  actual_wpm: sess.actual_wpm,
                  comprehension: sess.comprehension,
                }
              : null,
          };
        }),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /admin/users/:id/seen-passages/:passageId
 * Removes the user-passage seen record, re-allowing the passage for this user.
 */
export async function resetUserSeenPassage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: userId, passageId } = req.params;

    const record = await prisma.userPassageSeen.findUnique({
      where: { user_id_passage_id: { user_id: userId, passage_id: passageId } },
    });
    if (!record) throw new AppError("NOT_FOUND", "Seen record not found for this user/passage combination", 404);

    await prisma.userPassageSeen.delete({
      where: { user_id_passage_id: { user_id: userId, passage_id: passageId } },
    });

    res.json({ success: true, data: { reset: true, user_id: userId, passage_id: passageId } });
  } catch (err) {
    next(err);
  }
}
