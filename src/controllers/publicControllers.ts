import { Request, Response } from 'express';
import { db } from '../db';
import { sppg, schools, menus, articles } from '../db/skema';
import { eq } from 'drizzle-orm';

type IdParams = { id: string };

export const getAllSppg = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(sppg);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getSppgById = async (req: Request<IdParams>, res: Response) => {
  try {
    const { id } = req.params;
    const [data] = await db.select().from(sppg).where(eq(sppg.id, id));
    if (!data) return res.status(404).json({ message: 'SPPG tidak ditemukan' });
    const relatedSchools = await db.select().from(schools).where(eq(schools.sppgId, id));
    return res.json({ ...data, schools: relatedSchools });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllSekolah = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(schools);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getSekolahById = async (req: Request<IdParams>, res: Response) => {
  try {
    const { id } = req.params;
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    if (!school) return res.status(404).json({ message: 'Sekolah tidak ditemukan' });
    let sppgData = null;
    if (school.sppgId) {
      const [s] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));
      sppgData = s;
    }
    return res.json({ ...school, sppg: sppgData });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getMenu = async (req: Request, res: Response) => {
  try {
    const { sppg_id, sekolah_id } = req.query;
    if (sppg_id) {
      const data = await db.select().from(menus).where(eq(menus.sppgId, sppg_id as string));
      return res.json(data);
    }
    if (sekolah_id) {
      const [school] = await db.select().from(schools).where(eq(schools.id, sekolah_id as string));
      if (!school || !school.sppgId) return res.json([]);
      const data = await db.select().from(menus).where(eq(menus.sppgId, school.sppgId));
      return res.json(data);
    }
    const data = await db.select().from(menus);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllArtikel = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(articles);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const getArtikelById = async (req: Request<IdParams>, res: Response) => {
  try {
    const { id } = req.params;
    const [data] = await db.select().from(articles).where(eq(articles.id, id));
    if (!data) return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
