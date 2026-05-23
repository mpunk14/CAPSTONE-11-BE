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

const createStudentCount = (school: typeof schools.$inferSelect) => {
  if (typeof school.studentCount === 'number') return school.studentCount;
  const seed = Number(school.npsn.slice(-2));
  return Number.isFinite(seed) ? 300 + seed * 4 : 360;
};

const getTodayIsoDateWib = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
};

const toIsoDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  return null;
};

const hasMenuContent = (menu?: typeof menus.$inferSelect | null) =>
  Boolean(menu?.rice && String(menu.rice).trim()) ||
  Boolean(menu?.sideDish && String(menu.sideDish).trim()) ||
  Boolean(menu?.fruit && String(menu.fruit).trim());

const getBestMenuForToday = (menuRows: Array<typeof menus.$inferSelect>) => {
  const todayIso = getTodayIsoDateWib();
  const todayMenus = menuRows.filter((menu) => toIsoDate(menu.menuDate) === todayIso);
  const todayValid = todayMenus.filter((menu) => hasMenuContent(menu));
  if (todayValid.length) {
    return [...todayValid].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }

  if (todayMenus.length) {
    return [...todayMenus].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }

  const validMenus = menuRows.filter((menu) => hasMenuContent(menu));
  if (!validMenus.length) return null;
  return [...validMenus].sort((a, b) => String(b.menuDate).localeCompare(String(a.menuDate)))[0];
};

const enrichSchoolForPublicMap = (
  school: typeof schools.$inferSelect,
  menuRows: Array<typeof menus.$inferSelect> = [],
) => {
  const studentCount = createStudentCount(school);
  const todayMenu = getBestMenuForToday(menuRows);

  return {
    ...school,
    nama: school.schoolName,
    alamat: school.address,
    siswa: studentCount,
    studentCount,
    studentsCount: studentCount,
    jumlahSiswa: studentCount,
    capacity: studentCount,
    menuLabel: "Menu Hari Ini",
    menuTitle: todayMenu?.rice ?? "Belum ada menu hari ini",
    todayMenuTitle: todayMenu?.rice ?? "Belum ada menu hari ini",
    menuDetail: todayMenu ? [todayMenu.sideDish, todayMenu.fruit].filter(Boolean).join(", ") : "Data menu belum tersedia",
    todayMenuDetail: todayMenu ? [todayMenu.sideDish, todayMenu.fruit].filter(Boolean).join(", ") : "Data menu belum tersedia",
    calories: todayMenu?.calories ? `${todayMenu.calories} kcal` : "-",
    nutrition: todayMenu?.protein ? `Protein ${todayMenu.protein}g` : "Target Nutrisi: -",
    menuImageUrl: todayMenu?.menuImageUrl ?? null,
    menuImage: todayMenu?.menuImageUrl ?? null,
  };
};

const enrichSppgForPublicMap = async (unit: typeof sppg.$inferSelect) => {
  const relatedSchools = await db.select().from(schools).where(eq(schools.sppgId, unit.id));
  const schoolCount = relatedSchools.length;

  return {
    ...unit,
    nama: unit.name,
    alamat: unit.address,
    location: unit.address,
    kapasitas: unit.capacityPerDay ?? 0,
    capacity: unit.capacityPerDay ?? 0,
    schools: relatedSchools,
    schoolIds: relatedSchools.map((school) => school.id),
    sekolahIds: relatedSchools.map((school) => school.id),
    school_ids: relatedSchools.map((school) => school.id),
    schoolsServed: schoolCount,
    totalPartnerSchools: schoolCount,
    partnerSchools: schoolCount,
    schoolCount,
  };
};

export const getAllSppg = async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(sppg);
    const data = await Promise.all(rows.map(enrichSppgForPublicMap));
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
    const [rows, menuRows] = await Promise.all([
      db.select().from(schools),
      db.select().from(menus),
    ]);

    const menusBySppgId = new Map<string, Array<typeof menus.$inferSelect>>();
    for (const menu of menuRows) {
      menusBySppgId.set(menu.sppgId, [...(menusBySppgId.get(menu.sppgId) ?? []), menu]);
    }

    const data = rows.map((school) =>
      enrichSchoolForPublicMap(
        school,
        school.sppgId ? menusBySppgId.get(school.sppgId) ?? [] : [],
      ),
    );
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
    const menuRows = school.sppgId
      ? await db.select().from(menus).where(eq(menus.sppgId, school.sppgId))
      : [];
    return res.json({ success: true, data: { ...enrichSchoolForPublicMap(school, menuRows), sppg: sppgData } });
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
