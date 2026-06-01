/**
 * server/src/routes/sessions.ts
 *
 * Routes for the session resource.
 *
 * Endpoints:
 *  POST /api/sessions/start     — Pick an unseen passage for the user; return passage + questions.
 *  POST /api/sessions           — Submit a completed session with all MCQ responses; returns result.
 *  GET  /api/sessions           — List the authenticated user's session history (paginated).
 *  GET  /api/sessions/:id       — Get a single session by ID.
 *
 * All routes require auth middleware.
 */

import { Router } from "express";
import * as sessionsController from "../controllers/sessions.js";
import { requireAuth } from "../middleware/auth.js";
import { sessionRateLimit } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/start", requireAuth, sessionsController.startSession);
router.post("/mark-seen", requireAuth, sessionsController.markPassageSeen);
router.get("/domain-status", requireAuth, sessionsController.getDomainStatus);
router.post("/", requireAuth, sessionRateLimit, sessionsController.submitSession);
router.get("/", requireAuth, sessionsController.listSessions);
router.get("/history", requireAuth, sessionsController.getUserHistory);
router.get("/:id", requireAuth, sessionsController.getSession);

export default router;
