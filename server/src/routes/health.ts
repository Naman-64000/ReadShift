/**
 * server/src/routes/health.ts
 * Lightweight health-check route for Docker/K8s probes.
 *
 * GET /healthz
 *   Returns { status: "ok", uptime: <seconds>, ts: <ISO timestamp> }
 *   This endpoint is intentionally unauthenticated and not rate-limited
 *   so orchestrators can call it without credentials.
 */

import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { redis, isRedisAvailable } from "../lib/redis.js";

const router = Router();

router.get("/", async (_req, res) => {
  const checks: Record<string, string> = { api: "ok" };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Check Redis connectivity
  if (isRedisAvailable) {
    try {
      await redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "degraded";
    }
  } else {
    checks.redis = "unavailable";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    uptime: Math.floor(process.uptime()),
    ts: new Date().toISOString(),
    checks,
  });
});

export default router;
