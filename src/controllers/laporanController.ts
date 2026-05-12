import { Request, Response } from "express";
import { createLaporanService, getSemuaLaporanService, getLaporanByIdService } from "../services/laporan.service";
import { LaporanStatus } from "../types/laporan.type";
import { isUuid } from "../utils/uuid";

const allowedStatuses: LaporanStatus[] = ["submitted", "received", "reviewed"];

const getString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const parseRating = (value: unknown): number | null | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
};

export const createLaporan = async (req: Request, res: Response): Promise<any> => {
  try {
    const note = req.body.note ?? req.body.catatan;
    const status = (req.body.status ?? "submitted") as LaporanStatus;
    const sppgId = req.body.sppgId ?? req.body.sppg_id;
    const schoolId = req.body.schoolId ?? req.body.school_id ?? req.body.sekolah_id;
    const rating = parseRating(req.body.rating);

    if (!note || !sppgId || !schoolId) {
      return res.status(400).json({ success: false, message: "Semua field wajib diisi!" });
    }

    if (!isUuid(sppgId)) {
      return res.status(400).json({ success: false, message: "Format ID SPPG tidak valid" });
    }

    if (!isUuid(schoolId)) {
      return res.status(400).json({ success: false, message: "Format ID Sekolah tidak valid" });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Status laporan tidak valid" });
    }

    if (rating === null) {
      return res.status(400).json({ success: false, message: "Rating harus berupa angka 1 sampai 5" });
    }

    const payload = {
      note,
      status,
      sppgId,
      schoolId,
      rating,
    };

    const result = await createLaporanService(payload);

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
    const sppgId = getString(req.query.sppgId) ?? getString(req.query.sppg_id);
    const schoolId = getString(req.query.schoolId) ?? getString(req.query.school_id) ?? getString(req.query.sekolah_id);

    if (sppgId && !isUuid(sppgId)) {
      return res.status(400).json({ success: false, message: "Format ID SPPG tidak valid" });
    }

    if (schoolId && !isUuid(schoolId)) {
      return res.status(400).json({ success: false, message: "Format ID Sekolah tidak valid" });
    }

    const result = await getSemuaLaporanService({ sppgId, schoolId });

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
    const id = req.params.id as string;

    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Format ID tidak valid" });
    }

    const result = await getLaporanByIdService(id);

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
