import { Router } from "express";
import { testUpload } from "../controllers/uploadController";
import { createImageUpload, uploadSingleImage } from "../middlewares/uploadMiddleware";
import { verifyToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";

const router = Router();

router.post("/", uploadSingleImage("image"), testUpload);
router.post("/meal-documentation", verifyToken, requireRole("sppg", "school"), createImageUpload("simba/meal-documentation").single("photo"), testUpload);
router.post("/article-cover", verifyToken, requireRole("sppg"), createImageUpload("simba/articles").single("coverImage"), testUpload);
router.post("/profile", verifyToken, createImageUpload("simba/profiles").single("avatar"), testUpload);

export default router;