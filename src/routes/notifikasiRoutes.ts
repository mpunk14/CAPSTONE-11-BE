import { Router } from "express";
import { getNotifikasi, updateNotifikasiStatus } from "../controllers/publicControllers";

const router = Router();

router.get("/", getNotifikasi);
router.patch("/:id/status", updateNotifikasiStatus);

export default router;