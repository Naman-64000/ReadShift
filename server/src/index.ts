/**
 * server/src/index.ts
 * Express application entry point.
 */

import "./lib/env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./lib/logger.js";
import { startWorkers } from "./worker.js";
import { verifyRedisConnection } from "./lib/redis.js";
import { globalRateLimit } from "./middleware/rateLimiter.js";

// Routes
import usersRouter       from "./routes/users.js";
import sessionsRouter    from "./routes/sessions.js";
import passagesRouter    from "./routes/passages.js";
import calibrationsRouter from "./routes/calibrations.js";
import dashboardRouter   from "./routes/dashboard.js";
import adminRouter       from "./routes/admin.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Global middleware ─────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);

      // In local development, dynamically allow any localhost/127.0.0.1 port
      if (
        process.env.NODE_ENV === "development" &&
        (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))
      ) {
        return callback(null, true);
      }

      const allowedOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
      if (origin === allowedOrigin) {
        return callback(null, true);
      }

      callback(null, false); // Block other origins safely
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "256kb" }));
app.use("/api", globalRateLimit);

// Request logger
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "→ request");
  next();
});

// ── Health check ──────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ── API routes ────────────────────────────────────────────────
app.use("/api/users",        usersRouter);
app.use("/api/sessions",     sessionsRouter);
app.use("/api/passages",     passagesRouter);
app.use("/api/calibrations", calibrationsRouter);
app.use("/api/dashboard",    dashboardRouter);
app.use("/api/admin",        adminRouter);

// ── Global error handler (must be last) ───────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
async function boot() {
  // Probe Redis first so isRedisAvailable is set before workers start.
  await verifyRedisConnection();

  app.listen(PORT, () => {
    logger.info(`[ReadShift] Server listening on http://localhost:${PORT}`);
    startWorkers();
  });
}

boot().catch((err) => {
  console.error("[ReadShift] Fatal boot error:", err);
  process.exit(1);
});

export default app;
