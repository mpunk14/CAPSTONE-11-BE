import { Request, Response } from 'express';
import { db } from '../db';
import { notifications, menus } from '../db/skema';
import { eq } from 'drizzle-orm';

type IdParams = { id: string };

export const getNotifikasi = async (req: Request, res: Response) => {
  try {
    const { sppg_id } = req.query;
    if (!sppg_id) return res.status(400).json({ message: 'sppg_id wajib diisi' });
    const data = await db.select().from(notifications).where(eq(notifications.sppgId, sppg_id as string));
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getNotifikasiById = async (req: Request<IdParams>, res: Response) => {
  try {
    const { id } = req.params;
    const [data] = await db.select().from(notifications).where(eq(notifications.id, id));
    if (!data) return res.status(404).json({ message: 'Notifikasi tidak ditemukan' });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getRiwayatMenu = async (req: Request, res: Response) => {
  try {
    const { sppg_id } = req.query;
    if (!sppg_id) return res.status(400).json({ message: 'sppg_id wajib diisi' });
    const data = await db.select().from(menus).where(eq(menus.sppgId, sppg_id as string));
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
