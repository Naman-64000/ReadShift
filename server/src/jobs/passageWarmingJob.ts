/**
 * server/src/jobs/passageWarmingJob.ts
 *
 * Passage Warming — core logic + BullMQ worker wrapper.
 *
 * Key exports:
 *  - `runPassageWarming(domain, count)` — pure async function that runs
 *    the generation loop without any BullMQ dependency. Can be called directly
 *    from the in-memory fallback scheduler or from anywhere in the codebase.
 *  - `startPassageWarmingWorker()` — registers a BullMQ Worker that delegates
 *    directly to `runPassageWarming`. Used only when Redis is available.
 */

import { Worker, type Job } from "bullmq";
import crypto from "crypto";
import { redis } from "../lib/redis.js";
import { QUEUE_NAMES } from "../lib/queue.js";
import { aiService } from "../services/aiService.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import type { PassageGenerationJobData } from "../types/index.js";
import { evaluatePassageQuality } from "../services/passageQualityService.js";

// ── Standalone core runner ────────────────────────────────────────────────────

/**
 * Generates `count` passages for the given domain/level and persists them to
 * the database. Errors on individual generations are caught and logged; the
 * loop continues so a single bad generation does not abort the entire batch.
 *
 * This function is completely independent of BullMQ/Redis and can be invoked
 * directly when running in in-memory fallback mode.
 */
export async function runPassageWarming(
  domain: string,
  count: number
): Promise<void> {
  logger.info({ domain, count }, "Starting passage warming run");

  for (let i = 0; i < count; i++) {
    try {
      // 1. Generate Passage
      const passageData = await aiService.generatePassage(domain);

      // 2. Generate Questions
      const questions = await aiService.generateQuestions(passageData.body);

      // 3. Evaluate quality & persist
      const hash = crypto.createHash("sha256").update(passageData.body).digest("hex");
      const quality = await evaluatePassageQuality({
        body: passageData.body,
        word_count: passageData.word_count,
        questionCount: questions.length,
        source: "gemini",
        title: passageData.title,
      });

      await prisma.passage.create({
        data: {
          body: passageData.body,
          word_count: passageData.word_count,
          domain: domain as any,
          generated_by: passageData.generated_by,
          source: "gemini",
          status: quality.status,
          quality_score: quality.quality_score,
          title: passageData.title || quality.title,
          topic_key: quality.topic_key,
          paragraph_roadmaps: passageData.paragraph_roadmaps,
          skim_highlights: passageData.skim_highlights,
          hash,
          questions: {
            create: questions.map((q) => ({
              type: q.type,
              stem: q.stem,
              options: q.options,
              correct_index: q.correct_index,
              explanations: q.explanations,
            })),
          },
        },
      });

      logger.info({ domain, step: i + 1 }, "Generated passage successfully");
    } catch (err) {
      logger.error({ err, domain }, "Failed to generate passage in warming run");
      // Continue to next generation rather than failing the whole batch
    }
  }
}

// ── BullMQ Worker wrapper ─────────────────────────────────────────────────────

/**
 * Registers a BullMQ Worker for the passage-warming queue.
 * The Worker delegates all work to `runPassageWarming`.
 * Only call this when `isRedisAvailable` is true.
 */
export function startPassageWarmingWorker() {
  const worker = new Worker<PassageGenerationJobData>(
    QUEUE_NAMES.PASSAGE_WARMING,
    async (job: Job<PassageGenerationJobData>) => {
      const { domain, count } = job.data;
      await runPassageWarming(domain, count);
    },
    {
      connection: redis,
      concurrency: 2, // Allow 2 generations at once
    }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Passage warming BullMQ job failed");
  });

  return worker;
}
