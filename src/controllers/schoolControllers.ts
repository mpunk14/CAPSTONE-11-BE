import { Request, Response } from 'express';
import { db } from '../db';
import { schoolReports, notifications } from '../db/skema';
import { eq } from 'drizzle-orm';

export const kirimLaporan = async (req: Request, res: Response) => {
  try {
    const { schoolId, sppgId, note, rating } = req.body;
    if (!schoolId || !sppgId || !note) {
      return res.status(400).json({ message: 'schoolId, sppgId, dan note wajib diisi' });
    }
    const [laporan] = await db.insert(schoolReports).values({
      schoolId, sppgId, note,
      rating: rating ? parseInt(rating) : null,
      status: 'submitted',
    }).returning();
    await db.insert(notifications).values({
      sppgId, schoolId,
      type: 'notification',
      message: `Laporan baru diterima dari sekolah.`,
      status: 'new',
    });
    return res.status(201).json({ message: 'Laporan berhasil dikirim', data: laporan });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getRiwayatLaporan = async (req: Request, res: Response) => {
  try {
    const { sekolah_id } = req.query;
    if (!sekolah_id) return res.status(400).json({ message: 'sekolah_id wajib diisi' });
    const data = await db.select().from(schoolReports).where(eq(schoolReports.schoolId, sekolah_id as string));
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};