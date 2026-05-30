/**
 * server/src/controllers/users.ts
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../types/index.js";

const PrefsSchema = z.object({
  chunk_size:     z.union([z.literal(3), z.literal(4)]).optional(),
  fading_enabled: z.boolean().optional(),
  guide_enabled:  z.boolean().optional(),
  col_width:      z.enum(["narrow", "medium", "wide"]).optional(),
  font_size_px:   z.union([z.literal(16), z.literal(18), z.literal(21)]).optional(),
  domains:        z.array(z.enum(["business", "science", "history", "abstract", "social"])).min(1).optional(),
  mcq_timer:      z.number().int().min(0).max(180).optional(),
  highlight_intensity: z.enum(["subtle", "moderate", "intense"]).optional(),
  auto_center_scroll:  z.boolean().optional(),
});

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { preferences: true },
    });
    if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
    res.json({ success: true, data: { user, preferences: user.preferences } });
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.upsert({
      where: { clerk_id: req.auth!.authProviderId },
      update: { email: req.auth!.email },
      create: {
        clerk_id: req.auth!.authProviderId,
        email: req.auth!.email,
        preferences: { create: {} },
      },
      include: { preferences: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = PrefsSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);

    const prefs = await prisma.userPreferences.update({
      where: { user_id: req.auth!.userId },
      data: parsed.data,
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
