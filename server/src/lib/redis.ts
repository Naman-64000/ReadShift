/**
 * server/src/lib/redis.ts
 *
 * Dynamic Redis Connection Manager.
 *
 * Key behaviours:
 *  - Uses `lazyConnect: true` so that importing this module never triggers an
 *    immediate connection attempt (safe at test/import time).
 *  - `verifyRedisConnection()` is a one-shot startup prober that attempts to
 *    connect with a hard 2-second timeout. Call it once on server boot.
 *  - `isRedisAvailable` is a live boolean flag toggled by `connect`/`error`/
 *    `close` events so the rest of the app can react to mid-run outages and
 *    recoveries without re-calling the prober.
 *  - On hard connection errors the client suppresses the default throw and just
 *    logs, preventing unhandled-rejection crashes when Redis is absent.
 */

import { Redis } from "ioredis";
import { logger } from "./logger.js";

// ── Singleton client ──────────────────────────────────────────────────────────

export const redis = new Redis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  {
    lazyConnect: true,          // Don't auto-connect on import
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,    // Required for BullMQ
    // Limit reconnect attempts so we don't spin forever during an outage
    retryStrategy: (times: number) => {
      if (times > 5) return null; // Stop retrying after 5 attempts
      return Math.min(times * 500, 3000);
    },
  }
);

// ── Live availability flag ────────────────────────────────────────────────────

/**
 * Reflects the current live connection state of the Redis client.
 * Updated dynamically via event listeners so callers always see fresh status.
 */
export let isRedisAvailable = false;

redis.on("connect", () => {
  isRedisAvailable = true;
  logger.info("[Redis] Connection established.");
});

redis.on("ready", () => {
  isRedisAvailable = true;
  logger.info("[Redis] Client is ready.");
});

redis.on("error", (err: Error) => {
  isRedisAvailable = false;
  logger.error(`[Redis] Connection error: ${err.message}`);
});

redis.on("close", () => {
  isRedisAvailable = false;
  logger.warn("[Redis] Connection closed.");
});

redis.on("end", () => {
  isRedisAvailable = false;
  logger.warn("[Redis] Connection ended — no more reconnect attempts.");
});

// ── Startup prober ────────────────────────────────────────────────────────────

/**
 * Attempts to open the Redis connection with a 2-second hard timeout.
 *
 * Returns `true` when Redis is reachable and sets `isRedisAvailable = true`.
 * Returns `false` (never throws) when Redis is unreachable, leaving
 * `isRedisAvailable = false` so callers can engage their fallback logic.
 *
 * Call this **once** during server boot, before starting workers.
 */
export async function verifyRedisConnection(): Promise<boolean> {
  try {
    await Promise.race([
      redis.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timed out after 2s")), 2000)
      ),
    ]);
    isRedisAvailable = true;
    logger.info("[Redis] ✅ Startup connection verified.");
    return true;
  } catch (err) {
    isRedisAvailable = false;
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`[Redis] ⚠️  Not reachable at startup — entering fallback mode. Reason: ${message}`);
    return false;
  }
}
