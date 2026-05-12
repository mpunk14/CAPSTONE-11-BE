import { Router } from "express";
import { createLaporan, getLaporan, getLaporanById } from "../controllers/laporanController";
import { uploadFile } from "../middlewares/uploadMiddleware";

const router = Router();

router.post("/", uploadFile.single("foto"), createLaporan);
router.get("/", getLaporan);
router.get("/:id", getLaporanById);

export default router;
