import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../config/cloudinary";

const allowedImageMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedImageMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Hanya diperbolehkan mengunggah file gambar (JPG/PNG/WEBP/GIF)"));
};

export const createImageUpload = (folder = "simba/uploads") => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder,
      resource_type: "image" as const,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    }),
  });

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  });
};

export const uploadImage = createImageUpload();

export const uploadFile = uploadImage;
export const uploadSingleImage = (fieldName: string) => uploadImage.single(fieldName);
export const uploadManyImages = (fieldName: string, maxCount = 10) => uploadImage.array(fieldName, maxCount);