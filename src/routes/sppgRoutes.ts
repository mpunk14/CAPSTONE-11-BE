import { Router } from "express";
import { getAllSppg, getSppgById, getSppgDashboardSummary } from "../controllers/sppgControllers";
import { verifyToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";

const router = Router();

router.get("/", getAllSppg);
router.get("/dashboard/summary", verifyToken, requireRole("sppg"), getSppgDashboardSummary);
router.get("/:id", getSppgById);

export default router;