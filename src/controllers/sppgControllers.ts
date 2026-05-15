import { Request, Response } from "express";
import { db } from "../db"; 
import { eq } from "drizzle-orm";
import { schools, sppg } from "../db/skema";
import { isUuid } from "../utils/uuid";

type SppgRow = typeof sppg.$inferSelect;
type SchoolRow = typeof schools.$inferSelect;

const mapSppgForFe = (item: SppgRow, servedSchools: SchoolRow[] = []) => ({
  ...item,
  nama: item.name,
  kapasitas: item.capacityPerDay,
  staffCount: 0,
  schoolsServed: servedSchools.length,
  totalSchoolsServed: servedSchools.length,
  coverage: `Melayani ${servedSchools.length} sekolah`,
  schools: servedSchools.map((school) => school.id),
});

// GET semua data SPPG
export const getAllSppg = async (req: Request, res: Response): Promise<any> => {
  try {
    const sppgData = await db.select().from(sppg);
    const schoolData = await db.select().from(schools);
    const data = sppgData.map((item) => {
      const servedSchools = schoolData.filter((school) => school.sppgId === item.id);
      return mapSppgForFe(item, servedSchools);
    });
    
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
    const data = { ...mapSppgForFe(sppgData, servedSchools), schoolList: servedSchools };

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
