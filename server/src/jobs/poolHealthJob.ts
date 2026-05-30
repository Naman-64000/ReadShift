/**
 * server/src/jobs/poolHealthJob.ts
 */

import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { QUEUE_NAMES, passageWarmingQueue } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

const DOMAINS = ["business", "science", "history", "abstract", "social"];
const LEVELS = [1, 2, 3, 4];
const MIN_THRESHOLD = Number(process.env.PASSAGE_POOL_MIN_THRESHOLD) || 50;

export function startPoolHealthWorker() {
  const worker = new Worker(
    QUEUE_NAMES.POOL_HEALTH,
    async () => {
      logger.info("Running pool health check...");

      for (const domain of DOMAINS) {
        for (const level of LEVELS) {
          const count = await prisma.passage.count({
            where: {
              domain: domain as any,
              level,
              status: "ready",
              flagged: false,
            },
          });

          if (count < MIN_THRESHOLD) {
            const needed = MIN_THRESHOLD - count;
            logger.warn({ domain, level, count, needed }, "Passage pool low. Enqueueing warming job.");
            
            await passageWarmingQueue.add(
              `warm-${domain}-${level}-${Date.now()}`,
              { domain, level, count: Math.min(needed, 10) } // Max 10 per job to avoid timeout
            );
          }
        }
      }
    },
    { connection: redis }
  );

  return worker;
}
