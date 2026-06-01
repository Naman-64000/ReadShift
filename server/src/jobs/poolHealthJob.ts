/**
 * server/src/jobs/poolHealthJob.ts
 *
 * Pool Health Check — core logic + BullMQ worker wrapper.
 *
 * Key exports:
 *  - `runPoolHealthCheck()` — pure async function that inspects each domain
 *    passage count and triggers `runPassageWarming` directly when the pool is low.
 *    In BullMQ mode it enqueues a warming job instead; in fallback mode it calls
 *    the runner in-process.
 *  - `startPoolHealthWorker()` — registers a BullMQ Worker. Used only when
 *    Redis is available.
 */

import { Worker } from "bullmq";
import { redis, isRedisAvailable } from "../lib/redis.js";
import { QUEUE_NAMES, passageWarmingQueue } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { runPassageWarming } from "./passageWarmingJob.js";

const DOMAINS = ["business", "science", "history", "abstract", "social"];
const MIN_THRESHOLD = Number(process.env.PASSAGE_POOL_MIN_THRESHOLD) || 50;

// ── Standalone core runner ────────────────────────────────────────────────────

/**
 * Iterates every domain, counts ready passages, and
 * triggers replenishment when below MIN_THRESHOLD.
 *
 * When Redis is available the warming work is enqueued as a BullMQ job so it
 * is distributed and rate-limited correctly. When Redis is offline the runner
 * calls `runPassageWarming` directly in-process (fire-and-forget async).
 */
export async function runPoolHealthCheck(): Promise<void> {
  logger.info("Running pool health check...");

  for (const domain of DOMAINS) {
    try {
      const count = await prisma.passage.count({
        where: {
          domain: domain as any,
          status: "ready",
          flagged: false,
        },
      });

      if (count < MIN_THRESHOLD) {
        const needed = Math.min(MIN_THRESHOLD - count, 10); // Max 10 per run
        logger.warn({ domain, count, needed }, "Passage pool low — triggering warming.");

        if (isRedisAvailable) {
          // Standard path: enqueue a BullMQ job
          await passageWarmingQueue.add(
            `warm-${domain}-${Date.now()}`,
            { domain, count: needed }
          );
        } else {
          // Fallback path: run in-process (non-blocking fire-and-forget)
          runPassageWarming(domain, needed).catch((err) => {
            logger.error({ err, domain }, "In-memory passage warming failed");
          });
        }
      }
    } catch (err) {
      logger.error({ err, domain }, "Pool health check failed for domain");
    }
  }
}

// ── BullMQ Worker wrapper ─────────────────────────────────────────────────────

/**
 * Registers a BullMQ Worker for the pool-health queue.
 * The Worker delegates all work to `runPoolHealthCheck`.
 * Only call this when `isRedisAvailable` is true.
 */
export function startPoolHealthWorker() {
  const worker = new Worker(
    QUEUE_NAMES.POOL_HEALTH,
    async () => {
      await runPoolHealthCheck();
    },
    { connection: redis }
  );

  return worker;
}
