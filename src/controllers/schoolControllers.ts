import { Request, Response } from "express";
import { db } from "../db/index"; 
import { eq } from "drizzle-orm";
import { schoolReports, schools, sppg } from "../db/skema";
import { isUuid } from "../utils/uuid";

// GET semua data sekolah
export const getAllSekolah = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await db.select().from(schools);
    
    return res.status(200).json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error("Error GET getAllSekolah:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

// GET detail sekolah berdasarkan ID + nama SPPG mitra
export const getSekolahById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    if (!isUuid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Format ID Sekolah tidak valid" 
      });
    }

    const [school] = await db.select().from(schools).where(eq(schools.id, id));

    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: "Data Sekolah tidak ditemukan" 
      });
    }

    let partnerSppg = null;
    if (school.sppgId) {
      const [foundSppg] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));
      partnerSppg = foundSppg ?? null;
    }

    const data = { ...school, sppg: partnerSppg };

    return res.status(200).json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error("Error GET getSekolahById:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

export const getSchoolDashboardSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [school] = await db.select().from(schools).where(eq(schools.userId, userId));

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "Data sekolah milik user ini tidak ditemukan",
      });
    }

    let partnerSppg = null;
    if (school.sppgId) {
      const [foundSppg] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));
      partnerSppg = foundSppg
        ? {
            sppgId: foundSppg.id,
            sppgName: foundSppg.name,
            address: foundSppg.address,
          }
        : null;
    }

    const reportCount = await db.select({ id: schoolReports.id }).from(schoolReports).where(eq(schoolReports.schoolId, school.id));

    return res.status(200).json({
      success: true,
      data: {
        schoolName: school.schoolName,
        address: school.address,
        partnerSppg,
        totalReports: reportCount.length,
      },
    });
  } catch (error) {
    console.error("Error GET getSchoolDashboardSummary:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
