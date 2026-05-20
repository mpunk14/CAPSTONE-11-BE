import { Router } from "express";
import { createLaporan, getLaporan, getLaporanById } from "../controllers/laporanController";
import { verifyToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";

const router = Router();

router.post("/", verifyToken, requireRole("school", "sekolah"), createLaporan);
router.get("/", getLaporan);
router.get("/:id", getLaporanById);

export default router;
