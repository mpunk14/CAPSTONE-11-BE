import { Request, Response } from 'express';
import { db } from '../db/index';
import { sppg, schools, menus, articles, notifications } from '../db/skema';
import { eq } from 'drizzle-orm';
import { isUuid } from '../utils/uuid';

type IdParams = { id: string; sppgId?: string };
type SppgRow = typeof sppg.$inferSelect;
type SchoolRow = typeof schools.$inferSelect;

const parseCoordinate = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getQueryString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

const invalidUuidResponse = (res: Response, label: string) => {
  return res.status(400).json({ success: false, message: `Format ${label} tidak valid` });
};

const createStudentCount = (school: SchoolRow) => {
  if (typeof school.studentCount === 'number') return school.studentCount;
  const seed = Number(school.npsn.slice(-2));
  return Number.isFinite(seed) ? 300 + seed * 4 : 360;
};

const normalizeSppgForPublicMap = (partnerSppg: SppgRow | null) => {
  if (!partnerSppg) return null;

  const lat = parseCoordinate(partnerSppg.lat);
  const lng = parseCoordinate(partnerSppg.lng);

  return {
    ...partnerSppg,
    sppgId: partnerSppg.id,
    sppgName: partnerSppg.name,
    nama: partnerSppg.name,
    alamat: partnerSppg.address,
    kapasitas: partnerSppg.capacityPerDay ?? 0,
    location: partnerSppg.address,
    latitude: lat,
    longitude: lng,
    coordinates: { lat, lng },
  };
};

const enrichSchoolForPublicMap = (school: SchoolRow, partnerSppg: SppgRow | null = null) => {
  const studentCount = createStudentCount(school);
  const schoolLat = parseCoordinate(school.lat);
  const schoolLng = parseCoordinate(school.lng);
  const sppgLat = parseCoordinate(partnerSppg?.lat);
  const sppgLng = parseCoordinate(partnerSppg?.lng);
  const partnerSppgName = partnerSppg?.name ?? null;

  return {
    ...school,
    nama: school.schoolName,
    alamat: school.address,
    siswa: studentCount,
    studentCount,
    studentsCount: studentCount,
    jumlahSiswa: studentCount,
    capacity: studentCount,
    sppgName: partnerSppgName,
    partnerSppgName,
    affiliatedKitchen: partnerSppgName,
    sppg: normalizeSppgForPublicMap(partnerSppg),
    location: school.address,
    latitude: schoolLat,
    longitude: schoolLng,
    coordinates: { lat: schoolLat, lng: schoolLng },
    mapOverlay: {
      school: {
        id: school.id,
        name: school.schoolName,
        address: school.address,
        lat: schoolLat,
        lng: schoolLng,
        studentCount,
      },
      sppg: partnerSppg
        ? {
            id: partnerSppg.id,
            name: partnerSppg.name,
            address: partnerSppg.address,
            lat: sppgLat,
            lng: sppgLng,
          }
        : null,
      connection:
        partnerSppg && schoolLat !== null && schoolLng !== null && sppgLat !== null && sppgLng !== null
          ? {
              from: { lat: sppgLat, lng: sppgLng },
              to: { lat: schoolLat, lng: schoolLng },
              type: 'sppg-school',
            }
          : null,
    },
  };
};

const enrichSppgForPublicMap = async (unit: typeof sppg.$inferSelect) => {
  const relatedSchools = await db.select().from(schools).where(eq(schools.sppgId, unit.id));
  const overlaySchools = relatedSchools.map((school) => enrichSchoolForPublicMap(school, unit));
  const schoolCount = relatedSchools.length;
  const unitLat = parseCoordinate(unit.lat);
  const unitLng = parseCoordinate(unit.lng);

  return {
    ...unit,
    nama: unit.name,
    alamat: unit.address,
    location: unit.address,
    kapasitas: unit.capacityPerDay ?? 0,
    capacity: unit.capacityPerDay ?? 0,
    latitude: unitLat,
    longitude: unitLng,
    coordinates: { lat: unitLat, lng: unitLng },
    schools: overlaySchools,
    schoolIds: relatedSchools.map((school) => school.id),
    sekolahIds: relatedSchools.map((school) => school.id),
    school_ids: relatedSchools.map((school) => school.id),
    schoolsServed: schoolCount,
    totalPartnerSchools: schoolCount,
    partnerSchools: schoolCount,
    schoolCount,
    mapOverlay: {
      sppg: {
        id: unit.id,
        name: unit.name,
        address: unit.address,
        lat: unitLat,
        lng: unitLng,
      },
      schools: overlaySchools.map((school) => ({
        id: school.id,
        name: school.nama,
        address: school.alamat,
        lat: school.latitude,
        lng: school.longitude,
      })),
      connections: overlaySchools.map((school) => ({
        from: { lat: unitLat, lng: unitLng },
        to: { lat: school.latitude, lng: school.longitude },
        schoolId: school.id,
        type: 'sppg-school',
      })),
    },
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
    const [schoolRows, sppgRows] = await Promise.all([
      db.select().from(schools),
      db.select().from(sppg),
    ]);

    const sppgById = new Map(sppgRows.map((item) => [item.id, item]));
    const data = schoolRows.map((school) =>
      enrichSchoolForPublicMap(school, school.sppgId ? sppgById.get(school.sppgId) ?? null : null),
    );
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getOverlayMap = async (_req: Request, res: Response) => {
  try {
    const [sppgRows, schoolRows] = await Promise.all([
      db.select().from(sppg),
      db.select().from(schools),
    ]);

    const sppgPoints = sppgRows.map((unit) => {
      const lat = parseCoordinate(unit.lat);
      const lng = parseCoordinate(unit.lng);
      return {
        id: unit.id,
        type: 'sppg',
        name: unit.name,
        address: unit.address,
        lat,
        lng,
        coordinates: { lat, lng },
        capacity: unit.capacityPerDay ?? 0,
        label: unit.name,
      };
    });

    const schoolPoints = schoolRows.map((school) => {
      const lat = parseCoordinate(school.lat);
      const lng = parseCoordinate(school.lng);
      const studentCount = createStudentCount(school);
      return {
        id: school.id,
        type: 'school',
        name: school.schoolName,
        address: school.address,
        lat,
        lng,
        coordinates: { lat, lng },
        studentCount,
        label: school.schoolName,
        sppgId: school.sppgId ?? null,
      };
    });

    const sppgById = new Map(sppgRows.map((item) => [item.id, item]));
    const connections = schoolRows
      .filter((school) => Boolean(school.sppgId))
      .map((school) => {
        const partnerSppg = school.sppgId ? sppgById.get(school.sppgId) ?? null : null;
        const schoolLat = parseCoordinate(school.lat);
        const schoolLng = parseCoordinate(school.lng);
        const sppgLat = parseCoordinate(partnerSppg?.lat);
        const sppgLng = parseCoordinate(partnerSppg?.lng);

        return {
          id: `${school.sppgId}-${school.id}`,
          type: 'sppg-school',
          sppgId: school.sppgId,
          schoolId: school.id,
          from: partnerSppg
            ? {
                id: partnerSppg.id,
                name: partnerSppg.name,
                lat: sppgLat,
                lng: sppgLng,
              }
            : null,
          to: {
            id: school.id,
            name: school.schoolName,
            lat: schoolLat,
            lng: schoolLng,
          },
          active: partnerSppg !== null && schoolLat !== null && schoolLng !== null && sppgLat !== null && sppgLng !== null,
        };
      });

    return res.json({
      success: true,
      data: {
        sppg: sppgPoints,
        schools: schoolPoints,
        connections,
      },
    });
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

    return res.json({ success: true, data: enrichSchoolForPublicMap(school, sppgData) });
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
