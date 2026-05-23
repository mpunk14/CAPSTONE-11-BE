import { Router } from "express";
import { login, dashboard } from "../controllers/authControllers";
import { verifyToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/login", login);

// Endpoint GET /dashboard dilindungi oleh verifyToken middleware
router.get("/dashboard", verifyToken, dashboard);

export default router;