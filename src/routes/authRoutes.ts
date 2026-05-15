import { Router } from "express";
import { register, login, dashboard } from "../controllers/authControllers";
import { verifyToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Endpoint GET /dashboard dilindungi oleh verifyToken middleware
router.get("/dashboard", verifyToken, dashboard);

export default router;
