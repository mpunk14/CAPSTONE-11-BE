import { Router } from "express";
import { testUpload, uploadFromUrl, uploadSppgPhoto, uploadSchoolPhoto } from "../controllers/uploadController";
import { createImageUpload, uploadSingleImage } from "../middlewares/uploadMiddleware";
import { verifyToken } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";

const router = Router();

router.post("/", uploadSingleImage("image"), testUpload);
router.post("/from-url", verifyToken, requireRole("sppg", "school"), uploadFromUrl);
router.post("/meal-documentation", verifyToken, requireRole("sppg", "school"), createImageUpload("simba/meal-documentation").single("photo"), testUpload);
router.post("/article-cover", verifyToken, requireRole("sppg"), createImageUpload("simba/articles").single("coverImage"), testUpload);
router.post("/profile", verifyToken, createImageUpload("simba/profiles").single("avatar"), testUpload);
router.post("/sppg-photo", verifyToken, requireRole("sppg"), createImageUpload("simba/sppg/photos").single("photo"), uploadSppgPhoto);
router.post("/school-photo", verifyToken, requireRole("school"), createImageUpload("simba/school/photos").single("photo"), uploadSchoolPhoto);

export default router;