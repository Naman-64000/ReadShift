/**
 * server/src/routes/drills.ts
 * Routes for Subvocalization Metronome Drills.
 */

import { Router } from "express";
import * as drillsController from "../controllers/drills.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/start", requireAuth, drillsController.startDrill);
router.post("/complete", requireAuth, drillsController.completeDrill);

export default router;
