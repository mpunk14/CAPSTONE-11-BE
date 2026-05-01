import { Router } from "express";
import { getAllSppg, getSppgById } from "../controllers/sppgControllers";

const router = Router();

router.get("/", getAllSppg);
router.get("/:id", getSppgById);

export default router;