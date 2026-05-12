import { Request, Response } from 'express';
import { db } from '../db/index';
import { sppg, schools, menus, articles, notifications } from '../db/skema';
import { eq } from 'drizzle-orm';
import { isUuid } from '../utils/uuid';

type IdParams = { id: string; sppgId?: string };

const getQueryString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

const invalidUuidResponse = (res: Response, label: string) => {
  return res.status(400).json({ success: false, message: `Format ${label} tidak valid` });
};

export const getAllSppg = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(sppg);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getSppgById = async (req: Request<IdParams>, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return invalidUuidResponse(res, 'ID SPPG');

    const [data] = await db.select().from(sppg).where(eq(sppg.id, id));
    if (!data) return res.status(404).json({ success: false, message: 'SPPG tidak ditemukan' });

    const relatedSchools = await db.select().from(schools).where(eq(schools.sppgId, id));
    return res.json({ success: true, data: { ...data, schools: relatedSchools } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAllSekolah = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(schools);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getSekolahById = async (req: Request<IdParams>, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return invalidUuidResponse(res, 'ID Sekolah');

    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    if (!school) return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan' });

    let sppgData = null;
    if (school.sppgId) {
      const [s] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));
      sppgData = s;
    }
    return res.json({ success: true, data: { ...school, sppg: sppgData } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getMenu = async (req: Request<IdParams>, res: Response) => {
  try {
    const sppgId = req.params.sppgId ?? getQueryString(req.query.sppgId) ?? getQueryString(req.query.sppg_id);
    const schoolId = getQueryString(req.query.schoolId) ?? getQueryString(req.query.sekolah_id);

    if (sppgId && !isUuid(sppgId)) return invalidUuidResponse(res, 'ID SPPG');
    if (schoolId && !isUuid(schoolId)) return invalidUuidResponse(res, 'ID Sekolah');

    if (sppgId) {
      const data = await db.select().from(menus).where(eq(menus.sppgId, sppgId));
      return res.json({ success: true, data });
    }

    if (schoolId) {
      const [school] = await db.select().from(schools).where(eq(schools.id, schoolId));
      if (!school || !school.sppgId) return res.json({ success: true, data: [] });

      const data = await db.select().from(menus).where(eq(menus.sppgId, school.sppgId));
      return res.json({ success: true, data });
    }

    const data = await db.select().from(menus);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAllArtikel = async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(articles);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getArtikelById = async (req: Request<IdParams>, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return invalidUuidResponse(res, 'ID Artikel');

    const [data] = await db.select().from(articles).where(eq(articles.id, id));
    if (!data) return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' });

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getNotifikasi = async (req: Request, res: Response) => {
  try {
    const sppgId = getQueryString(req.query.sppgId) ?? getQueryString(req.query.sppg_id);
    const schoolId = getQueryString(req.query.schoolId) ?? getQueryString(req.query.sekolah_id);

    if (sppgId && !isUuid(sppgId)) return invalidUuidResponse(res, 'ID SPPG');
    if (schoolId && !isUuid(schoolId)) return invalidUuidResponse(res, 'ID Sekolah');

    let data = await db.select().from(notifications);

    if (sppgId) {
      data = data.filter((item) => item.sppgId === sppgId);
    }

    if (schoolId) {
      data = data.filter((item) => item.schoolId === schoolId);
    }

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
