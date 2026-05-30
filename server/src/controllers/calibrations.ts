/**
 * server/src/controllers/calibrations.ts
 */
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../types/index.js";

const SubmitSchema = z.object({
  wpm: z.number().int().positive().max(2000),
  recorded_at: z.string(),
});

export async function submitCalibration(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SubmitSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    const cal = await prisma.calibration.create({
      data: { user_id: req.auth!.userId, wpm: parsed.data.wpm, recorded_at: new Date(parsed.data.recorded_at) },
    });
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
