import { Router } from "express";
import { login, register, dashboard } from "../controllers/authControllers";
import { verifyToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Endpoint GET /dashboard dilindungi oleh verifyToken middleware
router.get("/dashboard", verifyToken, dashboard);

export default router;
