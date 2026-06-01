import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import {
  adminSummary,
  listAdminPassages,
  updateAdminPassage,
  listAdminUsers,
  updateAdminUser,
  getUserSeenPassages,
  resetUserSeenPassage,
} from "../controllers/admin.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/summary", adminSummary);
router.get("/passages", listAdminPassages);
router.patch("/passages/:id", updateAdminPassage);
router.get("/users", listAdminUsers);
router.patch("/users/:id", updateAdminUser);
router.get("/users/:id/seen-passages", getUserSeenPassages);
router.delete("/users/:id/seen-passages/:passageId", resetUserSeenPassage);

export default router;
