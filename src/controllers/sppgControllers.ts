import { Request, Response } from "express";
import { db } from "../db"; 
import { eq, inArray } from "drizzle-orm";
import { mealDocumentation, menus, schools, sppg } from "../db/skema";
import { isUuid } from "../utils/uuid";

// GET semua data SPPG
export const getAllSppg = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await db.select().from(sppg);
    
    return res.status(200).json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error("Error GET getAllSppg:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

// GET detail SPPG berdasarkan ID + list sekolah yang dilayani
export const getSppgById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
 
    if (!isUuid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Format ID SPPG tidak valid" 
      });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.id, id));

    if (!sppgData) {
      return res.status(404).json({ 
        success: false, 
        message: "Data SPPG tidak ditemukan" 
      });
    }

    const servedSchools = await db.select().from(schools).where(eq(schools.sppgId, id));
    const data = { ...sppgData, schools: servedSchools };

    return res.status(200).json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error("Error GET getSppgById:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

export const getSppgDashboardSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.userId, userId));

    if (!sppgData) {
      return res.status(404).json({
        success: false,
        message: "Data SPPG milik user ini tidak ditemukan",
      });
    }

    const partnerSchools = await db.select({ id: schools.id }).from(schools).where(eq(schools.sppgId, sppgData.id));
    const todayMenus = await db.select({ id: menus.id }).from(menus).where(eq(menus.sppgId, sppgData.id));

    return res.status(200).json({
      success: true,
      data: {
        sppgName: sppgData.name,
        operationalStatus: sppgData.status,
        totalPartnerSchools: partnerSchools.length,
        totalMenus: todayMenus.length,
      },
    });
  } catch (error) {
    console.error("Error GET getSppgDashboardSummary:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const parseTargetSchoolIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === "string" ? [item] : []));
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) => (typeof item === "string" ? [item] : []));
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const createMealDocumentation = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
    const productionDate = typeof req.body.productionDate === "string" && req.body.productionDate.trim()
      ? req.body.productionDate.trim()
      : new Date().toISOString().slice(0, 10);
    const targetSchoolIds = parseTargetSchoolIds(req.body.targetSchoolIds);
    const file = req.file as Express.Multer.File & { secure_url?: string; path?: string; public_id?: string } | undefined;
    const photoUrl = file?.secure_url ?? file?.path;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!photoUrl) {
      return res.status(400).json({ success: false, message: "Foto dokumentasi wajib diunggah" });
    }

    if (!notes) {
      return res.status(400).json({ success: false, message: "Notes wajib diisi" });
    }

    if (!targetSchoolIds.length) {
      return res.status(400).json({ success: false, message: "targetSchoolIds wajib diisi" });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.userId, userId));

    if (!sppgData) {
      return res.status(404).json({ success: false, message: "Data SPPG milik user ini tidak ditemukan" });
    }

    const validSchools = await db.select({ id: schools.id }).from(schools).where(inArray(schools.id, targetSchoolIds));
    const validSchoolIds = new Set(validSchools.map((item) => item.id));
    const invalidSchoolIds = targetSchoolIds.filter((id) => !validSchoolIds.has(id));

    if (invalidSchoolIds.length) {
      return res.status(400).json({
        success: false,
        message: "Ada targetSchoolIds yang tidak valid",
        invalidSchoolIds,
      });
    }

    const inserted = await Promise.all(
      targetSchoolIds.map((targetSchoolId) =>
        db
          .insert(mealDocumentation)
          .values({
            sppgId: sppgData.id,
            targetSchoolId,
            productionDate,
            photoUrl,
            notes,
            uploadedByRole: "sppg",
          })
          .returning(),
      ),
    );

    const data = inserted.flat();

    return res.status(201).json({
      success: true,
      message: "Dokumentasi makanan berhasil disimpan",
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
