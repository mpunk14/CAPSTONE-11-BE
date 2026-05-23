import { Request, Response } from "express";

export const testUpload = async (req: Request, res: Response): Promise<any> => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File gambar wajib diunggah",
      });
    }

    const cloudinaryFile = file as Express.Multer.File & { path?: string; secure_url?: string; public_id?: string };
    const imageUrl = cloudinaryFile.secure_url ?? cloudinaryFile.path;

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