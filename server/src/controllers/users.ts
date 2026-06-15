/**
 * server/src/controllers/users.ts
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../types/index.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PrefsSchema = z.object({
  chunk_size:     z.union([z.literal(2), z.literal(3)]).optional(),
  fading_enabled: z.boolean().optional(),
  guide_enabled:  z.boolean().optional(),
  col_width:      z.enum(["narrow", "medium", "wide"]).optional(),
  font_size_px:   z.union([z.literal(10), z.literal(12), z.literal(14), z.literal(16)]).optional(),
  domains:        z.array(z.enum(["business", "science", "history", "abstract", "social"])).min(1).optional(),
  mcq_timer:      z.number().int().min(0).max(180).optional(),
  highlight_intensity: z.enum(["none", "subtle", "moderate", "intense"]).optional(),
  auto_center_scroll:  z.boolean().optional(),
  laap_enabled:        z.boolean().optional(),
  skim_enabled:        z.boolean().optional(),
  mcqs_enabled:        z.boolean().optional(),
  progress_bar_enabled: z.boolean().optional(),
  timer_enabled:       z.boolean().optional(),
  roadmaps_enabled:    z.boolean().optional(),
  timed_passages_enabled: z.boolean().optional(),
  gemini_api_key:      z.string().nullable().optional(),
});

async function updateStreakActivity(userId: string, timezoneOffset: number) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { streak_days: true, last_session_at: true },
    });
    if (!user) return null;

    let newStreak = user.streak_days;
    const now = new Date();
    const lastSession = user.last_session_at;

    if (!lastSession) {
      newStreak = 1;
    } else {
      const lastDate = new Date(lastSession.getTime() - timezoneOffset * 60_000).toISOString().slice(0, 10);
      const todayDate = new Date(now.getTime() - timezoneOffset * 60_000).toISOString().slice(0, 10);
      const yesterday = new Date(now.getTime() - timezoneOffset * 60_000);
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

    return await tx.user.update({
      where: { id: userId },
      data: {
        streak_days: newStreak,
        last_session_at: now,
      },
      include: { preferences: true },
    });
  });
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const offsetVal = req.query.timezone_offset;
    const timezoneOffset = typeof offsetVal === "string" ? parseInt(offsetVal, 10) : 0;
    const cleanOffset = isNaN(timezoneOffset) ? 0 : timezoneOffset;

    const user = await updateStreakActivity(req.auth!.userId, cleanOffset);
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);

    // Healing logic: if non-admin user has skimming or roadmaps enabled in DB, force-disable them
    if (!user.is_admin && user.preferences && (user.preferences.skim_enabled || user.preferences.roadmaps_enabled)) {
      const updatedPrefs = await prisma.userPreferences.update({
        where: { id: user.preferences.id },
        data: {
          skim_enabled: false,
          roadmaps_enabled: false,
        },
      });
      user.preferences = updatedPrefs;
    }

    res.json({ success: true, data: { user, preferences: user.preferences } });
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const offsetVal = req.query.timezone_offset;
    const timezoneOffset = typeof offsetVal === "string" ? parseInt(offsetVal, 10) : 0;
    const cleanOffset = isNaN(timezoneOffset) ? 0 : timezoneOffset;

    // Find if user already exists by authProviderId (clerk_id)
    const existingUser = await prisma.user.findUnique({
      where: { clerk_id: req.auth!.authProviderId },
    });

    let user;
    if (existingUser) {
      // User exists - update email and streak activity
      user = await updateStreakActivity(existingUser.id, cleanOffset);
      if (!user) {
        // Fallback update email
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: { email: req.auth!.email },
          include: { preferences: true },
        });
      } else if (user.email !== req.auth!.email) {
        // Sync email if changed
        user = await prisma.user.update({
          where: { id: user.id },
          data: { email: req.auth!.email },
          include: { preferences: true },
        });
      }
    } else {
      // Create new user with initial streak of 1
      user = await prisma.user.create({
        data: {
          clerk_id: req.auth!.authProviderId,
          email: req.auth!.email,
          preferences: {
            create: {
              skim_enabled: false,
              roadmaps_enabled: false,
            },
          },
          streak_days: 1,
          last_session_at: new Date(),
        },
        include: { preferences: true },
      });
    }

    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = PrefsSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);

    let geminiApiKey = parsed.data.gemini_api_key;

    if (geminiApiKey !== undefined) {
      if (geminiApiKey === null || geminiApiKey.trim() === "") {
        geminiApiKey = null;
      } else {
        const trimmedKey = geminiApiKey.trim();
        try {
          const genAI = new GoogleGenerativeAI(trimmedKey);
          const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
          await model.generateContent({
            contents: [{ role: "user", parts: [{ text: "hi" }] }],
            generationConfig: { maxOutputTokens: 1 }
          });
          geminiApiKey = trimmedKey;
        } catch (err: any) {
          console.error("Gemini API key verification failed:", err);
          if (!trimmedKey) {
            throw new AppError("VALIDATION_ERROR", "Please enter an API key", 400);
          } else {
            throw new AppError("VALIDATION_ERROR", "Please enter a valid API key", 400);
          }
        }
      }
    }

    const { gemini_api_key: parsedApiKey, ...otherData } = parsed.data;

    if (!req.auth!.isAdmin) {
      otherData.skim_enabled = false;
      otherData.roadmaps_enabled = false;
    }

    const prefs = await prisma.userPreferences.update({
      where: { user_id: req.auth!.userId },
      data: {
        ...otherData,
        ...(geminiApiKey !== undefined ? { gemini_api_key: geminiApiKey } : {}),
      },
    });
    res.json({ success: true, data: prefs });
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.user.delete({ where: { id: req.auth!.userId } });
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function checkEmailExists(req: Request, res: Response, next: NextFunction) {
  try {
    const email = req.query.email;
    if (typeof email !== "string" || !email) {
      throw new AppError("VALIDATION_ERROR", "Email parameter is required", 400);
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    res.json({ success: true, data: { exists: !!user } });
  } catch (err) { next(err); }
}
