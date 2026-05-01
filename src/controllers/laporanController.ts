import { Request, Response } from "express";
import { createLaporanService, getSemuaLaporanService, getLaporanByIdService } from "../services/laporan.service";

export const createLaporan = async (req: Request, res: Response): Promise<any> => {
  try {
    const { catatan, status, sppg_id, sekolah_id } = req.body;
    const file = req.file;

    // Validasi input
    if (!catatan || !status || !sppg_id || !sekolah_id) {
      return res.status(400).json({ success: false, message: "Semua field wajib diisi!" });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "File foto wajib diunggah!" });
    }

    const payload = {
      catatan,
      status,
      sppg_id: parseInt(sppg_id),
      sekolah_id: parseInt(sekolah_id),
    };

    const result = createLaporanService(payload, file.filename);

    return res.status(201).json({
      success: true,
      message: "Laporan berhasil dibuat",
      data: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getLaporan = async (req: Request, res: Response): Promise<any> => {
  try {
    const sppg_id = req.query.sppg_id ? parseInt(req.query.sppg_id as string) : undefined;
    const sekolah_id = req.query.sekolah_id ? parseInt(req.query.sekolah_id as string) : undefined;

    const result = getSemuaLaporanService(sppg_id, sekolah_id);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getLaporanById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Format ID tidak valid" });
    }

    const result = getLaporanByIdService(id);

    if (!result) {
      return res.status(404).json({ success: false, message: "Data Laporan tidak ditemukan" });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};