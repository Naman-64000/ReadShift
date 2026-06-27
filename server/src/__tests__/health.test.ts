/**
 * server/src/__tests__/health.test.ts
 *
 * Integration tests for the health-check routes.
 * Uses supertest to fire HTTP requests against the Express app directly
 * (no actual server listen needed).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";

// ── Mock heavy dependencies so tests run without real DB / Redis ──────────────

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

vi.mock("../lib/redis.js", () => ({
  redis: { ping: vi.fn().mockResolvedValue("PONG") },
  isRedisAvailable: true,
  verifyRedisConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/env.js", () => ({}));

// Must import app AFTER mocks are set up
let app: Awaited<ReturnType<typeof import("../index.js")["default"]>>;

beforeAll(async () => {
  const mod = await import("../index.js");
  app = mod.default as any;
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /healthz", () => {
  it("returns 200 with status ok when all deps are healthy", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.checks.api).toBe("ok");
    expect(res.body.checks.database).toBe("ok");
    expect(res.body.checks.redis).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
    expect(typeof res.body.ts).toBe("string");
  });
});

describe("GET /health", () => {
  it("returns 200 with simple ok response (legacy alias)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
