/**
 * server/src/lib/queue.ts
 *
 * BullMQ queue definitions and shared connection config.
 *
 * What this file will do:
 *  - Export named Queue instances for each background job type:
 *      passageWarmingQueue — triggers passage generation when pool is low.
 *      poolHealthQueue     — periodic job to check pool depth per domain-level.
 *      streakResetQueue    — daily job to reset streaks for inactive users.
 *  - All queues share the same Redis connection (imported from ./redis).
 *  - Export queue names as constants to prevent string typos across the codebase.
 */

import { Queue } from "bullmq";
import { redis } from "./redis.js";

export const QUEUE_NAMES = {
  PASSAGE_WARMING: "passage-warming",
  POOL_HEALTH: "pool-health",
  STREAK_RESET: "streak-reset",
} as const;

export const passageWarmingQueue = new Queue(QUEUE_NAMES.PASSAGE_WARMING, {
  connection: redis,
});

export const poolHealthQueue = new Queue(QUEUE_NAMES.POOL_HEALTH, {
  connection: redis,
});

export const streakResetQueue = new Queue(QUEUE_NAMES.STREAK_RESET, {
  connection: redis,
});
