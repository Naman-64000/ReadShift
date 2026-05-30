/**
 * server/src/worker.ts
 *
 * Entry point for background workers.
 */

import { startPassageWarmingWorker } from "./jobs/passageWarmingJob.js";
import { startPoolHealthWorker } from "./jobs/poolHealthJob.js";
import { startStreakResetWorker } from "./jobs/streakResetJob.js";
import { logger } from "./lib/logger.js";

export function startWorkers() {
  logger.info("Initializing background workers...");

  try {
    startPassageWarmingWorker();
    startPoolHealthWorker();
    startStreakResetWorker();
    
    logger.info("✅ All background workers started successfully.");
  } catch (err) {
    logger.error({ err }, "❌ Failed to start background workers");
  }
}
