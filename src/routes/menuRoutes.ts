import { Router } from "express";
import { getMenuRiwayat, uploadMenuCsv } from "../controllers/menuController";
import { verifyToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";
import { uploadCsv } from "../middlewares/csvUploadMiddleware";

const router = Router();

router.post("/upload", verifyToken, requireRole("sppg"), uploadCsv.single("file"), uploadMenuCsv);
router.get("/riwayat", verifyToken, requireRole("sppg"), getMenuRiwayat);

export default router;
