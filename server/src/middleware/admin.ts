import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types/index.js";

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.isAdmin) {
    return next(new AppError("FORBIDDEN", "Admin access required", 403));
  }
  next();
}
