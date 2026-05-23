import { Router } from "express";
import { createLaporan, getLaporan, getLaporanById } from "../controllers/laporanController";
import { verifyToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";
import { createImageUpload } from "../middlewares/uploadMiddleware";

const router = Router();

router.post("/", verifyToken, requireRole("school", "sekolah"), createImageUpload("simba/laporan").single("attachment"), createLaporan);
router.get("/", getLaporan);
router.get("/:id", getLaporanById);

export default router;
