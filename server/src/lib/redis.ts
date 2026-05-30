/**
 * server/src/lib/redis.ts
 *
 * Singleton ioredis client instance.
 *
 * What this file will do:
 *  - Create a single Redis connection from REDIS_URL env var.
 *  - Export the client for use by BullMQ queues and any cache logic.
 *  - Log connection errors and retry automatically (ioredis default behaviour).
 *  - Export a lazyConnect option so the connection is not attempted at import time
 *    when running tests.
 */

import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,   // Required for BullMQ
});

redis.on("error", (err) => {
  const error = err as Error;
  console.error("[Redis] Connection error:", error.message);
});
