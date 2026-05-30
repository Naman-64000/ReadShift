/**
 * server/src/jobs/streakResetJob.ts
 *
 * Streak Reset — core logic + BullMQ worker wrapper.
 *
 * Key exports:
 *  - `runStreakResetCheck()` — pure async function that resets streaks for
 *    inactive users. Has zero BullMQ dependency; can be called directly from
 *    the in-memory fallback scheduler.
 *  - `startStreakResetWorker()` — registers a BullMQ Worker that delegates to
 *    `runStreakResetCheck`. Used only when Redis is available.
 */

import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { QUEUE_NAMES } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

// ── Standalone core runner ────────────────────────────────────────────────────

/**
 * Finds all users who have not had a session in the last 24 hours and whose
 * streak is currently > 0, then resets their streak to 0.
 *
 * This function is completely independent of BullMQ/Redis and can be invoked
 * directly when running in in-memory fallback mode.
 */
export async function runStreakResetCheck(): Promise<void> {
  logger.info("Running daily streak reset check...");

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Find all users who haven't had a session in over 24 hours
    // and whose streak is currently > 0
    const usersToReset = await prisma.user.findMany({
      where: {
        last_session_at: {
          lt: twentyFourHoursAgo,
        },
        streak_days: {
          gt: 0,
        },
      },
    });

    if (usersToReset.length > 0) {
      logger.info({ count: usersToReset.length }, "Resetting streaks for inactive users");

      await prisma.user.updateMany({
        where: {
          id: {
            in: usersToReset.map((u) => u.id),
          },
        },
        data: {
          streak_days: 0,
        },
      });
    } else {
      logger.info("No users require streak reset.");
    }
  } catch (err) {
    logger.error({ err }, "Streak reset check encountered an error");
  }
}

// ── BullMQ Worker wrapper ─────────────────────────────────────────────────────

/**
 * Registers a BullMQ Worker for the streak-reset queue.
 * The Worker delegates all work to `runStreakResetCheck`.
 * Only call this when `isRedisAvailable` is true.
 */
export function startStreakResetWorker() {
  const worker = new Worker(
    QUEUE_NAMES.STREAK_RESET,
    async () => {
      await runStreakResetCheck();
    },
    { connection: redis }
  );

  return worker;
}
