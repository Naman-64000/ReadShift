/**
 * server/src/routes/passages.ts
 *
 * Routes for the passage resource.
 *
 * Endpoints:
 *  GET   /api/passages          — List passages (admin only; for pool monitoring).
 *  POST  /api/passages/:id/flag — Flag a passage for quality review.
 *
 * Note: Passage selection for sessions happens in /api/sessions/start,
 *       not through this route (to keep the transaction atomic).
 */

import { Router } from "express";
import * as passagesController from "../controllers/passages.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, passagesController.listPassages);
router.post("/:id/flag", requireAuth, passagesController.flagPassage);
router.post("/:id/rate", requireAuth, passagesController.ratePassage);

export default router;
