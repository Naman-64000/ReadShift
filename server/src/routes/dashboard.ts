/**
 * server/src/routes/dashboard.ts
 *
 * Routes for the dashboard resource.
 *
 * Endpoints:
 *  GET /api/dashboard/summary   — Return full dashboard summary for the authenticated user.
 *                                  Includes: current WPM, level, streak, comprehension avg,
 *                                  WPM trend (last 30 sessions), domain accuracy breakdown,
 *                                  weak domains, and recommendation.
 *                                  Target response time: < 300ms.
 */

import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/summary", requireAuth, dashboardController.getSummary);

export default router;
