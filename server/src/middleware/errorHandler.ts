/**
 * server/src/middleware/errorHandler.ts
 * Global Express error handler.
 */

import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types/index.js";
import { logger } from "../lib/logger.js";

const STATUS_MAP: Record<string, number> = {
  UNAUTHORIZED:    401,
  FORBIDDEN:       403,
  NOT_FOUND:       404,
  POOL_EXHAUSTED:  404,
  VALIDATION_ERROR: 400,
  INTERNAL_ERROR:  500,
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const isAppError = err instanceof AppError;
  const code = isAppError ? err.code : "INTERNAL_ERROR";
  const status = isAppError ? err.statusCode : (STATUS_MAP[code] ?? 500);
  const message = isAppError
    ? err.message
    : process.env.NODE_ENV === "production"
    ? "An unexpected error occurred."
    : err.message;

  logger.error({ err, code, status }, "Request error");

  res.status(status).json({ success: false, error: { code, message } });
}
