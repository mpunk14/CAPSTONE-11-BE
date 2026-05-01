import { Request, Response } from "express";
import { db } from "../db"; 
import { eq } from "drizzle-orm";
import { sppg } from "../db/skema"; // Menggunakan skema.ts

// GET semua data SPPG
export const getAllSppg = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await db.query.sppg.findMany();
    
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
 
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "ID tidak boleh kosong" 
      });
    }

    const data = await db.query.sppg.findFirst({
      where: eq(sppg.id, id), 
      with: {
        sekolah: true 
      },
    });

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: "Data SPPG tidak ditemukan" 
      });
    }

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