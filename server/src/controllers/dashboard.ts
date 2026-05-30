/**
 * server/src/controllers/dashboard.ts
 */
import type { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboardService.js";

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.buildSummary(req.auth!.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
