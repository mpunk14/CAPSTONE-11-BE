import { Router } from "express";
import { getNotifikasi } from "../controllers/publicControllers";

const router = Router();

router.get("/", getNotifikasi);

export default router;
