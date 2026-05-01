import { Request, Response } from "express";
import { db } from "../db/index"; 
import { eq } from "drizzle-orm";
import { schools } from "../db/skema"; // Pastikan tetap pakai skema.ts

// GET semua data sekolah
export const getAllSekolah = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await db.query.schools.findMany();
    
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

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "ID tidak boleh kosong" 
      });
    }

    const data = await db.query.schools.findFirst({
      where: eq(schools.id, id), 
      with: {
        sppg: {
          columns: {
            nama: true 
          }
        }
      },
    });

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: "Data Sekolah tidak ditemukan" 
      });
    }

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