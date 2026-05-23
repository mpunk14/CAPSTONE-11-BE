import { Router } from "express";
import { login, register, dashboard, getMyProfile, updateMyProfile } from "../controllers/authControllers";
import { verifyToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Endpoint GET /dashboard dilindungi oleh verifyToken middleware
router.get("/dashboard", verifyToken, dashboard);
router.get("/profile", verifyToken, getMyProfile);
router.patch("/profile", verifyToken, updateMyProfile);

export default router;
