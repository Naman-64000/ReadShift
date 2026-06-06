/**
 * server/src/controllers/drills.ts
 * Controller for Subvocalization Metronome Drills.
 */

import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { aiService } from "../services/aiService.js";
import { AppError } from "../types/index.js";

const prisma = new PrismaClient();

const StartDrillSchema = z.object({
  level: z.number().int().min(1).max(6),
});

const CompleteDrillSchema = z.object({
  drill_passage_id: z.string().uuid(),
});

export async function startDrill(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = StartDrillSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    }

    const userId = req.auth!.userId;
    const { level } = parsed.data;

    // 1. Find all drill passages for this level
    const allDrillsForLevel = await prisma.drillPassage.findMany({
      where: { level },
      orderBy: { created_at: "asc" },
    });

    // 2. Find which ones the user has seen
    const seenDrills = await prisma.userDrillSeen.findMany({
      where: { user_id: userId },
      select: { drill_passage_id: true },
    });
    const seenDrillIds = new Set(seenDrills.map((s) => s.drill_passage_id));

    // 3. Find the first unseen drill
    const unseenDrill = allDrillsForLevel.find((d) => !seenDrillIds.has(d.id));

    if (unseenDrill) {
      return res.json({
        success: true,
        data: {
          drill: {
            id: unseenDrill.id,
            body: unseenDrill.body,
            word_count: unseenDrill.word_count,
            question_stem: unseenDrill.question_stem,
            options: unseenDrill.options,
            correct_index: unseenDrill.correct_index,
          },
          generated: false,
        },
      });
    }

    // 4. If all are seen, generate a new one on-the-fly!
    const userPrefs = await prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { gemini_api_key: true },
    });

    const userApiKey = userPrefs?.gemini_api_key;
    const generated = await aiService.generateDrillPassage(level, userApiKey);

    // Save the new generated drill passage to DB
    const newDrill = await prisma.drillPassage.create({
      data: {
        level,
        body: generated.body,
        word_count: generated.word_count,
        question_stem: generated.question_stem,
        options: generated.options,
        correct_index: generated.correct_index,
        source: "gemini",
      },
    });

    return res.json({
      success: true,
      data: {
        drill: {
          id: newDrill.id,
          body: newDrill.body,
          word_count: newDrill.word_count,
          question_stem: newDrill.question_stem,
          options: newDrill.options,
          correct_index: newDrill.correct_index,
        },
        generated: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function completeDrill(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CompleteDrillSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    }

    const userId = req.auth!.userId;
    const { drill_passage_id } = parsed.data;

    await prisma.userDrillSeen.upsert({
      where: {
        user_id_drill_passage_id: {
          user_id: userId,
          drill_passage_id,
        },
      },
      update: {},
      create: {
        user_id: userId,
        drill_passage_id,
      },
    });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
