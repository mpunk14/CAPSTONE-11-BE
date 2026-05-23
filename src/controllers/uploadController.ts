import { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary";

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

export const testUpload = async (req: Request, res: Response): Promise<any> => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File gambar wajib diunggah",
      });
    }

    const cloudinaryFile = file as Express.Multer.File & { path?: string; secure_url?: string; public_id?: string; filename?: string };
    let imageUrl = cloudinaryFile.secure_url ?? cloudinaryFile.path ?? null;

    if (!imageUrl || !isHttpUrl(imageUrl)) {
      const publicId = cloudinaryFile.public_id ?? cloudinaryFile.filename ?? null;
      if (publicId) {
        imageUrl = cloudinary.url(publicId, { secure: true });
      }
    }

    if (!imageUrl || !isHttpUrl(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: "Upload gambar ke Cloudinary gagal. Coba unggah ulang.",
      });
    }

    return res.status(201).json({
      success: true,
      imageUrl,
      publicId: cloudinaryFile.public_id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
