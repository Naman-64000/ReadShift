/**
 * server/src/worker.ts
 *
 * Dual-Mode Worker Bootstrapper.
 *
 * Boot behaviour (decided once at startup by `isRedisAvailable`):
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │  STANDARD MODE (Redis available)                                    │
 *  │  • Registers 3 BullMQ Workers: passageWarming, poolHealth,         │
 *  │    streakReset.                                                     │
 *  │  • Workers consume their respective queues as normal.               │
 *  ├─────────────────────────────────────────────────────────────────────┤
 *  │  GRACEFUL IN-MEMORY FALLBACK MODE (Redis unavailable)               │
 *  │  • No BullMQ workers are started (they would crash without Redis).  │
 *  │  • setInterval timers run the core task functions directly:         │
 *  │      – runPoolHealthCheck  every 10 minutes                        │
 *  │      – runStreakResetCheck every 12 hours                           │
 *  │  • All intervals are .unref()'d so they won't prevent clean exit.  │
 *  └─────────────────────────────────────────────────────────────────────┘
 */

import { isRedisAvailable } from "./lib/redis.js";
import { logger } from "./lib/logger.js";

// BullMQ workers (only imported/used in standard mode)
import { startPassageWarmingWorker } from "./jobs/passageWarmingJob.js";
import { startPoolHealthWorker } from "./jobs/poolHealthJob.js";
import { startStreakResetWorker } from "./jobs/streakResetJob.js";

// Standalone runners (used in fallback mode)
import { runPoolHealthCheck } from "./jobs/poolHealthJob.js";
import { runStreakResetCheck } from "./jobs/streakResetJob.js";

const TEN_MINUTES_MS   = 10 * 60 * 1000;
const TWELVE_HOURS_MS  = 12 * 60 * 60 * 1000;

export function startWorkers(): void {
  if (isRedisAvailable) {
    // ── Standard BullMQ Mode ──────────────────────────────────────────────
    logger.info("[Workers] 🟢 Redis available — starting BullMQ workers.");

    try {
      startPassageWarmingWorker();
      startPoolHealthWorker();
      startStreakResetWorker();
      logger.info("[Workers] ✅ All BullMQ workers registered successfully.");
    } catch (err) {
      logger.error({ err }, "[Workers] ❌ Failed to register BullMQ workers.");
    }
  } else {
    // ── Graceful In-Memory Fallback Mode ──────────────────────────────────
    logger.warn(
      "[Workers] ⚠️  Redis unavailable — falling back to in-memory interval scheduling. " +
      "BullMQ workers will NOT be started. Background tasks will run via setInterval."
    );

    // Pool health: every 10 minutes
    const poolInterval = setInterval(() => {
      runPoolHealthCheck().catch((err) => {
        logger.error({ err }, "[Workers:Fallback] Pool health check error");
      });
    }, TEN_MINUTES_MS);
    poolInterval.unref();

    // Streak reset: every 12 hours
    const streakInterval = setInterval(() => {
      runStreakResetCheck().catch((err) => {
        logger.error({ err }, "[Workers:Fallback] Streak reset check error");
      });
    }, TWELVE_HOURS_MS);
    streakInterval.unref();

    // Run both immediately on boot so we don't wait a full cycle on startup.
    runPoolHealthCheck().catch((err) => {
      logger.error({ err }, "[Workers:Fallback] Initial pool health check error");
    });
    runStreakResetCheck().catch((err) => {
      logger.error({ err }, "[Workers:Fallback] Initial streak reset check error");
    });

    logger.info("[Workers] ✅ In-memory fallback intervals registered (pool: 10min, streak: 12hr).");
  }
}
