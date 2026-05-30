/**
 * server/src/middleware/rateLimiter.ts
 *
 * Rate limiting middleware.
 *
 * What this middleware will do:
 *  - Implement a per-user rate limit on session submission:
 *      Max 20 session submissions per hour per user.
 *  - Implement a global rate limit per IP on the API:
 *      Max 200 requests per minute per IP.
 *  - Use Redis (ioredis) as the backing store for distributed rate limit state.
 *  - Return 429 Too Many Requests with a Retry-After header when limits are exceeded.
 *
 * Export:
 *  globalRateLimit  — applied to all /api routes in index.ts.
 *  sessionRateLimit — applied specifically to POST /api/sessions.
 */

import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis.js";

type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

async function checkLimit(key: string, max: number, windowSeconds: number): Promise<LimitResult> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);
  const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;
  const remaining = Math.max(0, max - count);

  return {
    allowed: count <= max,
    remaining,
    retryAfterSeconds,
  };
}

export function globalRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `rl:global:${ip}`;
  const max = 200;
  const windowSeconds = 60;

  checkLimit(key, max, windowSeconds)
    .then((result) => {
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(result.remaining));
      res.setHeader("X-RateLimit-Reset", String(result.retryAfterSeconds));

      if (!result.allowed) {
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        return res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        });
      }

      next();
    })
    .catch(next);
}

export function sessionRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const identity = req.auth?.userId || req.ip || req.socket.remoteAddress || "anonymous";
  const key = `rl:session:${identity}`;
  const max = 20;
  const windowSeconds = 60 * 60;

  checkLimit(key, max, windowSeconds)
    .then((result) => {
      res.setHeader("X-SessionRateLimit-Limit", String(max));
      res.setHeader("X-SessionRateLimit-Remaining", String(result.remaining));
      res.setHeader("X-SessionRateLimit-Reset", String(result.retryAfterSeconds));

      if (!result.allowed) {
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        return res.status(429).json({
          success: false,
          error: {
            code: "SESSION_RATE_LIMITED",
            message: "Session submission limit reached. Please try again later.",
          },
        });
      }

      next();
    })
    .catch(next);
}
