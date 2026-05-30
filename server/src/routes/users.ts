/**
 * server/src/routes/users.ts
 *
 * Routes for user resource.
 *
 * Endpoints:
 *  GET    /api/users/me                  — Return the authenticated user + preferences.
 *  POST   /api/users                     — Create a new user record on first auth login.
 *  PATCH  /api/users/me/preferences      — Update user preferences (partial).
 *  DELETE /api/users/me                  — Delete account and all associated data.
 *
 * All routes require auth middleware.
 */

import { Router } from "express";
import * as usersController from "../controllers/users.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, usersController.getMe);
router.post("/", requireAuth, usersController.createUser);
router.patch("/me/preferences", requireAuth, usersController.updatePreferences);
router.delete("/me", requireAuth, usersController.deleteUser);

export default router;
