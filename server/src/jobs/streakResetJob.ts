/**
 * server/src/jobs/streakResetJob.ts
 */

import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { QUEUE_NAMES } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export function startStreakResetWorker() {
  const worker = new Worker(
    QUEUE_NAMES.STREAK_RESET,
    async () => {
      logger.info("Running daily streak reset check...");

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
      }
    },
    { connection: redis }
  );

  return worker;
}
