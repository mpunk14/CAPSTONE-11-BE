import { Router } from "express";
import { createMealDocumentation, getAllSppg, getMealDocumentationHistory, getSppgById, getSppgDashboardSummary } from "../controllers/sppgControllers";
import { verifyToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";
import { createImageUpload } from "../middlewares/uploadMiddleware";

const router = Router();

router.get("/", getAllSppg);
router.get("/dashboard/summary", verifyToken, requireRole("sppg"), getSppgDashboardSummary);
router.get("/meals/documentation", verifyToken, requireRole("sppg"), getMealDocumentationHistory);
router.post("/meals/documentation", verifyToken, requireRole("sppg"), createImageUpload("simba/meal-documentation").single("photo"), createMealDocumentation);
router.get("/:id", getSppgById);

export default router;
