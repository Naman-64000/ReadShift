/**
 * server/src/controllers/passages.ts
 */
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../types/index.js";

export async function listPassages(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Number(req.query.limit ?? 20));
    const [passages, total] = await Promise.all([
      prisma.passage.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { created_at: "desc" } }),
      prisma.passage.count(),
    ]);
    res.json({ success: true, data: { passages, total, page, limit } });
  } catch (err) { next(err); }
}

export async function flagPassage(req: Request, res: Response, next: NextFunction) {
  try {
    const passage = await prisma.passage.findUnique({ where: { id: req.params.id } });
    if (!passage) throw new AppError("NOT_FOUND", "Passage not found", 404);
    const updated = await prisma.passage.update({ where: { id: req.params.id }, data: { flagged: true } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function ratePassage(req: Request, res: Response, next: NextFunction) {
  try {
    const { rating } = req.body;
    if (rating !== "up" && rating !== "down") {
      throw new AppError("VALIDATION_ERROR", "Rating must be 'up' or 'down'", 400);
    }

    const passage = await prisma.passage.findUnique({ where: { id: req.params.id } });
    if (!passage) throw new AppError("NOT_FOUND", "Passage not found", 404);

    let updated;
    if (rating === "up") {
      updated = await prisma.passage.update({
        where: { id: req.params.id },
        // Increment quality_score by 1, or initialize to 1 if it was null
        data: { quality_score: passage.quality_score ? { increment: 1 } : 1 },
      });
    } else {
      const newFlagCount = (passage.flag_count ?? 0) + 1;
      updated = await prisma.passage.update({
        where: { id: req.params.id },
        data: {
          flag_count: { increment: 1 },
          flagged: newFlagCount >= 3 ? true : passage.flagged,
          status: newFlagCount >= 3 ? "flagged" : passage.status,
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}
