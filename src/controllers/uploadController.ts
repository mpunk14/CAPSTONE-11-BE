import { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary";
import { db } from "../db";
import { sppg, schools } from "../db/skema";
import { eq } from "drizzle-orm";
import { isUuid } from "../utils/uuid";

type UploadFromUrlBody = {
  imageUrl?: string;
  folder?: string;
  publicId?: string;
};

type AuthRequest = Request & { userId?: string; role?: 'sppg' | 'school' };

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

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

export const uploadFromUrl = async (req: Request<any, any, UploadFromUrlBody>, res: Response): Promise<any> => {
  try {
    const imageUrl = typeof req.body.imageUrl === "string" ? req.body.imageUrl.trim() : "";
    const folder = typeof req.body.folder === "string" && req.body.folder.trim()
      ? req.body.folder.trim()
      : "simba/uploads";
    const publicId = typeof req.body.publicId === "string" && req.body.publicId.trim()
      ? req.body.publicId.trim()
      : undefined;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "imageUrl wajib diisi",
      });
    }

    if (!isValidHttpUrl(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: "Format imageUrl tidak valid",
      });
    }

    const uploaded = await cloudinary.uploader.upload(imageUrl, {
      folder,
      public_id: publicId,
      resource_type: "image",
    });

    return res.status(201).json({
      success: true,
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error",
    });
  }
};

export const uploadSppgPhoto = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const { sppgId } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File gambar wajib diunggah",
      });
    }

    if (!sppgId || !isUuid(sppgId)) {
      return res.status(400).json({
        success: false,
        message: "ID SPPG tidak valid",
      });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.id, sppgId));
    if (!sppgData) {
      return res.status(404).json({
        success: false,
        message: "SPPG tidak ditemukan",
      });
    }

    if (req.role !== 'sppg' || req.userId !== sppgData.userId) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk mengubah foto SPPG ini",
      });
    }

    const cloudinaryFile = file as Express.Multer.File & { secure_url?: string; public_id?: string };
    const photoUrl = cloudinaryFile.secure_url || cloudinaryFile.path;
    const publicId = cloudinaryFile.public_id;

    await db.update(sppg).set({ photoUrl }).where(eq(sppg.id, sppgId));

    return res.status(200).json({
      success: true,
      message: "Foto SPPG berhasil diperbarui",
      data: {
        sppgId,
        photoUrl,
        publicId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error",
    });
  }
};

export const uploadSchoolPhoto = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const { schoolId } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "File gambar wajib diunggah",
      });
    }

    if (!schoolId || !isUuid(schoolId)) {
      return res.status(400).json({
        success: false,
        message: "ID Sekolah tidak valid",
      });
    }

    const [schoolData] = await db.select().from(schools).where(eq(schools.id, schoolId));
    if (!schoolData) {
      return res.status(404).json({
        success: false,
        message: "Sekolah tidak ditemukan",
      });
    }

    if (req.role !== 'school' || req.userId !== schoolData.userId) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk mengubah foto Sekolah ini",
      });
    }

    const cloudinaryFile = file as Express.Multer.File & { secure_url?: string; public_id?: string };
    const photoUrl = cloudinaryFile.secure_url || cloudinaryFile.path;
    const publicId = cloudinaryFile.public_id;

    await db.update(schools).set({ photoUrl }).where(eq(schools.id, schoolId));

    return res.status(200).json({
      success: true,
      message: "Foto Sekolah berhasil diperbarui",
      data: {
        schoolId,
        photoUrl,
        publicId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error",
    });
  }
};