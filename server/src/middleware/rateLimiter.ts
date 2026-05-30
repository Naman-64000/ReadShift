/**
 * server/src/middleware/rateLimiter.ts
 *
 * Resilient Rate Limiting Middleware.
 *
 * Strategy:
 *  - PRIMARY: Use Redis (ioredis) for distributed rate limit state when
 *    `isRedisAvailable` is true. This is the normal production path.
 *  - FALLBACK: If Redis is unavailable OR any Redis operation throws, silently
 *    catch the error, log a warning, and fall back to an in-process Map store.
 *    The API never returns 500 and never crashes due to Redis absence.
 *
 * Memory leak guard:
 *  - A background `setInterval` (unreffed so it won't keep the process alive)
 *    prunes stale entries from the in-memory store every 5 minutes.
 *
 * Exports:
 *  globalRateLimit  — Max 200 req/min per IP.  Applied to all /api routes.
 *  sessionRateLimit — Max 20 sessions/hour per user. Applied to POST /api/sessions.
 */

import type { Request, Response, NextFunction } from "express";
import { redis, isRedisAvailable } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

// ── In-memory fallback store ──────────────────────────────────────────────────

interface MemoryEntry {
  count: number;
  expiresAt: number; // Unix epoch ms
}

const memoryStore = new Map<string, MemoryEntry>();

// Prune expired entries every 5 minutes to prevent memory growth.
const pruneInterval = setInterval(() => {
  const now = Date.now();
  let pruned = 0;
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
      pruned++;
    }
  }
  if (pruned > 0) {
    logger.debug(`[RateLimiter] Pruned ${pruned} stale in-memory rate limit entries.`);
  }
}, 5 * 60 * 1000);

// Unref so this timer won't prevent Node from exiting cleanly.
pruneInterval.unref();

// ── In-memory rate limiter ────────────────────────────────────────────────────

function checkLimitInMemory(key: string, max: number, windowSeconds: number): LimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const existing = memoryStore.get(key);
  let count: number;
  let expiresAt: number;

  if (!existing || existing.expiresAt <= now) {
    // New window
    count = 1;
    expiresAt = now + windowMs;
  } else {
    count = existing.count + 1;
    expiresAt = existing.expiresAt;
  }

  memoryStore.set(key, { count, expiresAt });

  const retryAfterSeconds = Math.ceil((expiresAt - now) / 1000);

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    retryAfterSeconds,
  };
}

// ── Redis rate limiter ────────────────────────────────────────────────────────

async function checkLimitRedis(key: string, max: number, windowSeconds: number): Promise<LimitResult> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  const ttl = await redis.ttl(key);
  const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    retryAfterSeconds,
  };
}

// ── Core check logic (with fallback) ─────────────────────────────────────────

type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

async function checkLimit(key: string, max: number, windowSeconds: number): Promise<LimitResult> {
  if (isRedisAvailable) {
    try {
      return await checkLimitRedis(key, max, windowSeconds);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`[RateLimiter] Redis operation failed, switching to in-memory fallback. Reason: ${message}`);
    }
  }

  // In-memory fallback path (Redis offline or threw)
  return checkLimitInMemory(key, max, windowSeconds);
}

// ── Middleware exports ────────────────────────────────────────────────────────

export function globalRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
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

export function sessionRateLimit(req: Request, res: Response, next: NextFunction) {
  const identity = req.auth?.userId ?? req.ip ?? req.socket.remoteAddress ?? "anonymous";
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
