import { Request, Response } from "express";
import { db } from "../db"; 
import { eq } from "drizzle-orm";
import { menus, schools, sppg } from "../db/skema";
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
