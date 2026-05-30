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

    const where = {
      ...(domain ? { domain: domain as any } : {}),
      ...(status ? { status: status as any } : {}),
    };

    const [passages, total] = await Promise.all([
      prisma.passage.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { questions: true, sessions: true } },
        },
      }),
      prisma.passage.count({ where }),
    ]);

    res.json({ success: true, data: { passages, total, page, limit } });
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
        level: true,
        streak_days: true,
        created_at: true,
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
        level: true,
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
    const [passagesByStatus, passagesByDomainLevel, users] = await Promise.all([
      prisma.passage.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.passage.groupBy({ by: ["domain", "level", "status"], _count: { _all: true } }),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      data: {
        users,
        passages_by_status: passagesByStatus,
        passages_by_domain_level: passagesByDomainLevel,
      },
    });
  } catch (err) {
    next(err);
  }
}
