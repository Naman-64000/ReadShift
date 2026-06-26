/**
 * server/src/controllers/calibrations.ts
 */
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { redis, isRedisAvailable } from "../lib/redis.js";
import { AppError } from "../types/index.js";

const SubmitSchema = z.object({
  wpm: z.number().int().min(100).max(2000),
  recorded_at: z.string(),
});

export async function submitCalibration(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const cal = await prisma.calibration.create({
      data: { user_id: req.auth!.userId, wpm: parsed.data.wpm, recorded_at: new Date(parsed.data.recorded_at) },
    });

    if (isRedisAvailable) {
      try {
        await redis.del(`dashboard:summary:${req.auth!.userId}`);
      } catch (err) {
        // ignore deletion errors
      }
    }

    res.status(201).json({ success: true, data: cal });
  } catch (err) { next(err); }
}

export async function listCalibrations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await prisma.calibration.findMany({
      where: { user_id: req.auth!.userId },
      orderBy: { recorded_at: "desc" },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getLatestCalibration(req: Request, res: Response, next: NextFunction) {
  try {
    const lastThree = await prisma.calibration.findMany({
      where: { user_id: req.auth!.userId },
      orderBy: { recorded_at: "desc" },
      take: 3,
    });

    if (lastThree.length === 0) {
      return res.json({ success: true, data: null });
    }

    const averageWpm = Math.round(
      lastThree.reduce((sum, c) => sum + c.wpm, 0) / lastThree.length
    );

    res.json({ 
      success: true, 
      data: {
        ...lastThree[0],
        average_wpm: averageWpm, // The true baseline
      } 
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/calibrations/passage
 * Returns a random ready passage from the DB to use for calibration reading.
 * Does NOT mark the passage as seen or create any session — read-only.
 */
export async function getCalibrationPassage(_req: Request, res: Response, next: NextFunction) {
  try {
    // Fetch a pool of ready passages and pick one randomly
    const passages = await prisma.passage.findMany({
      where: {
        flagged: false,
        status: "ready",
      },
      select: {
        id: true,
        body: true,
        word_count: true,
        domain: true,
        title: true,
        topic_key: true,
        created_at: true,
      },
      take: 100,
      orderBy: { created_at: "desc" },
    });

    if (!passages.length) {
      throw new AppError("NOT_FOUND", "No passages available for calibration", 404);
    }

    // Weighted random pick (fresher passages get slightly higher weight)
    const weights = passages.map((_, i) => Math.max(0.1, 1 - i * 0.005));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let chosen = passages[passages.length - 1];
    for (let i = 0; i < passages.length; i++) {
      r -= weights[i];
      if (r <= 0) { chosen = passages[i]; break; }
    }

    res.json({ success: true, data: { id: chosen.id, body: chosen.body, word_count: chosen.word_count, domain: chosen.domain, title: chosen.title, topic_key: chosen.topic_key } });
  } catch (err) { next(err); }
}
