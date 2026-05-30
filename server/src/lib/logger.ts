/**
 * server/src/lib/logger.ts
 *
 * Pino logger instance.
 *
 * What this file will do:
 *  - Create and export a Pino logger configured for the current environment.
 *  - In development: use pino-pretty for human-readable output.
 *  - In production/staging: output structured JSON.
 *  - Log level driven by LOG_LEVEL env var (default: "info").
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
