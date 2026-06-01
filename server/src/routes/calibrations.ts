/**
 * server/src/routes/calibrations.ts
 *
 * Routes for the calibration resource.
 *
 * Endpoints:
 *  POST /api/calibrations       — Submit a calibration result; saves WPM baseline.
 *  GET  /api/calibrations       — List the authenticated user's calibration history.
 *  GET  /api/calibrations/latest — Return the most recent calibration (current baseline WPM).
 */

import { Router } from "express";
import * as calibrationsController from "../controllers/calibrations.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, calibrationsController.submitCalibration);
router.get("/passage", requireAuth, calibrationsController.getCalibrationPassage);
router.get("/latest", requireAuth, calibrationsController.getLatestCalibration);
router.get("/", requireAuth, calibrationsController.listCalibrations);


export default router;
