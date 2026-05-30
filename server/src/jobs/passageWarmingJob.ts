/**
 * server/src/jobs/passageWarmingJob.ts
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

export function startPassageWarmingWorker() {
  const worker = new Worker<PassageGenerationJobData>(
    QUEUE_NAMES.PASSAGE_WARMING,
    async (job: Job<PassageGenerationJobData>) => {
      const { domain, level, count } = job.data;
      logger.info({ domain, level, count }, "Starting passage warming job");

      for (let i = 0; i < count; i++) {
        try {
          // 1. Generate Passage
          const passageData = await aiService.generatePassage(domain, level);

          // 2. Generate Questions
          const questions = await aiService.generateQuestions(passageData.body);

          // 3. Save to DB
          const hash = crypto.createHash("sha256").update(passageData.body).digest("hex");
          const quality = evaluatePassageQuality({
            body: passageData.body,
            word_count: passageData.word_count,
            questionCount: questions.length,
            source: "gemini",
          });

          await prisma.passage.create({
            data: {
              body: passageData.body,
              word_count: passageData.word_count,
              domain: domain as any,
              level,
              generated_by: passageData.generated_by,
              source: "gemini",
              status: quality.status,
              quality_score: quality.quality_score,
              topic_key: quality.topic_key,
              hash,
              questions: {
                create: questions.map(q => ({
                  type: q.type,
                  stem: q.stem,
                  options: q.options,
                  correct_index: q.correct_index,
                })),
              },
            },
          });

          logger.info({ domain, level, step: i + 1 }, "Generated passage successfully");
        } catch (err) {
          logger.error({ err, domain, level }, "Failed to generate passage in job");
          // Continue to next one rather than failing the whole job
        }
      }
    },
    { 
      connection: redis,
      concurrency: 2, // Allow 2 generations at once
    }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Passage warming job failed");
  });

  return worker;
}
