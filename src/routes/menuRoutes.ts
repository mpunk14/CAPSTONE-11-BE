import { Router } from "express";
import { getMenuRiwayat, uploadMenuCsv, uploadNutritionCsv } from "../controllers/menuController";
import { verifyToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";
import { uploadCsv } from "../middlewares/csvUploadMiddleware";

const router = Router();

router.post("/upload", verifyToken, requireRole("sppg"), uploadCsv.single("file"), uploadMenuCsv);
router.post("/upload-nutrition", verifyToken, requireRole("sppg"), uploadCsv.single("file"), uploadNutritionCsv);
router.get("/riwayat", verifyToken, requireRole("sppg"), getMenuRiwayat);

export default router;
