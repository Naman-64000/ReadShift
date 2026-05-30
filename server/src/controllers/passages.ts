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
