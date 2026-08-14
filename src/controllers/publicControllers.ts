import { Request, Response } from 'express';
import { db } from '../db/index';
import { sppg, schools, menus, articles, notifications, mealDocumentation, cvAnalysisResults } from '../db/skema';
import { eq, and, gte, lte } from 'drizzle-orm';
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

export const updateNotifikasiStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return invalidUuidResponse(res, 'ID Notifikasi');

    const nextStatus = typeof req.body?.status === 'string' ? req.body.status : '';
    const allowedStatuses = ['new', 'received', 'reviewed'];

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const [updatedNotification] = await db
      .update(notifications)
      .set({ status: nextStatus })
      .where(eq(notifications.id, id))
      .returning();

    if (!updatedNotification) {
      return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' });
    }

    return res.json({ success: true, data: updatedNotification });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ──────────────────────────────────────────────────────────────
// NEW: Public Dashboard — FR-08
// GET /api/public/dashboard
// Returns today's menu + nutrition summary per SPPG for the
// public transparency dashboard.
// ──────────────────────────────────────────────────────────────
export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    const [sppgRows, todayMenus, schoolRows] = await Promise.all([
      db.select().from(sppg),
      db.select().from(menus).where(eq(menus.menuDate, todayStr)),
      db.select().from(schools),
    ]);

    // Build lookup maps
    const menuBySppgId = new Map(todayMenus.map((m) => [m.sppgId, m]));
    const schoolCountBySppgId = new Map<string, number>();
    for (const school of schoolRows) {
      if (!school.sppgId) continue;
      schoolCountBySppgId.set(school.sppgId, (schoolCountBySppgId.get(school.sppgId) ?? 0) + 1);
    }

    const data = sppgRows.map((unit) => {
      const menu = menuBySppgId.get(unit.id) ?? null;
      return {
        sppgId: unit.id,
        sppgName: unit.name,
        address: unit.address,
        status: unit.status,
        partnerSchools: schoolCountBySppgId.get(unit.id) ?? 0,
        todayMenu: menu
          ? {
              menuDate: menu.menuDate,
              rice: menu.rice,
              sideDish: menu.sideDish,
              fruit: menu.fruit,
              nutrition: {
                calories: menu.calories ? Number(menu.calories) : null,
                protein: menu.protein ? Number(menu.protein) : null,
                carbohydrate: menu.carbohydrate ? Number(menu.carbohydrate) : null,
                fat: menu.fat ? Number(menu.fat) : null,
                fiber: menu.fiber ? Number(menu.fiber) : null,
              },
            }
          : null,
        hasMenuToday: menu !== null,
      };
    });

    return res.json({ success: true, data, date: todayStr });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ──────────────────────────────────────────────────────────────
// NEW: Public Peta SPPG with verification score — FR-11
// GET /api/public/peta
// Returns SPPG list with lat/lng + CV verification score
// so Leaflet.js can color-code markers by verification status.
// ──────────────────────────────────────────────────────────────
export const getPetaSppg = async (_req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    const [sppgRows, docRows] = await Promise.all([
      db.select().from(sppg),
      // Get today's documentation records
      db
        .select()
        .from(mealDocumentation)
        .where(
          and(
            gte(mealDocumentation.productionDate, todayStr),
            lte(mealDocumentation.productionDate, tomorrowStr),
          ),
        ),
    ]);

    // Get CV analysis results for today's docs
    const docIds = docRows.map((d) => d.id);
    const analysisRows = docIds.length
      ? await db
          .select()
          .from(cvAnalysisResults)
          .where(eq(cvAnalysisResults.status, 'completed'))
      : [];

    // Map docId -> analysisResult
    const analysisById = new Map(analysisRows.map((a) => [a.documentationId, a]));

    // Map sppgId -> today's docs
    const docsBySppgId = new Map<string, typeof docRows>();
    for (const doc of docRows) {
      const existing = docsBySppgId.get(doc.sppgId) ?? [];
      existing.push(doc);
      docsBySppgId.set(doc.sppgId, existing);
    }

    const parseCoord = (v: string | number | null | undefined) => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const data = sppgRows.map((unit) => {
      const sppgDocs = docsBySppgId.get(unit.id) ?? [];

      // Calculate average match score from completed CV analyses
      const scores = sppgDocs
        .map((doc) => analysisById.get(doc.id))
        .filter((a): a is NonNullable<typeof a> => a != null && !a.isFlagged)
        .map((a) => (a.matchScore ? Number(a.matchScore) : null))
        .filter((s): s is number => s !== null);

      const verificationScore =
        scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : null;

      const flaggedCount = sppgDocs.filter((doc) => {
        const analysis = analysisById.get(doc.id);
        return analysis?.isFlagged === true;
      }).length;

      return {
        id: unit.id,
        name: unit.name,
        address: unit.address,
        status: unit.status,
        lat: parseCoord(unit.lat),
        lng: parseCoord(unit.lng),
        capacityPerDay: unit.capacityPerDay,
        // Verification data for map coloring
        verificationScore,
        hasDocumentationToday: sppgDocs.length > 0,
        flaggedCount,
        verificationStatus:
          sppgDocs.length === 0
            ? 'no_data'
            : flaggedCount > 0
              ? 'flagged'
              : verificationScore !== null && verificationScore >= 80
                ? 'verified'
                : 'partial',
      };
    });

    return res.json({ success: true, data, date: todayStr });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// ──────────────────────────────────────────────────────────────
// NEW: Get documentation with CV analysis for a specific SPPG
// GET /api/public/sppg/:id/dokumentasi
// ──────────────────────────────────────────────────────────────
export const getSppgDokumentasi = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: 'Format ID SPPG tidak valid' });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.id, id));
    if (!sppgData) {
      return res.status(404).json({ success: false, message: 'SPPG tidak ditemukan' });
    }

    const docs = await db
      .select()
      .from(mealDocumentation)
      .where(eq(mealDocumentation.sppgId, id));

    const docIds = docs.map((d) => d.id);
    const analyses = docIds.length
      ? await db
          .select()
          .from(cvAnalysisResults)
          .where(eq(cvAnalysisResults.status, 'completed'))
      : [];

    const analysisById = new Map(analyses.map((a) => [a.documentationId, a]));

    const data = docs.map((doc) => {
      const analysis = analysisById.get(doc.id) ?? null;
      return {
        id: doc.id,
        photoUrl: doc.photoUrl,
        notes: doc.notes,
        productionDate: doc.productionDate,
        analysisStatus: doc.analysisStatus,
        createdAt: doc.createdAt,
        cvAnalysis: analysis
          ? {
              matchScore: analysis.matchScore ? Number(analysis.matchScore) : null,
              isFlagged: analysis.isFlagged,
              flagReason: analysis.flagReason,
              detectedFoods: (() => {
                try { return analysis.detectedFoods ? JSON.parse(analysis.detectedFoods) : []; }
                catch { return []; }
              })(),
              estimatedNutrition: {
                calories: analysis.estimatedCalories ? Number(analysis.estimatedCalories) : null,
                protein: analysis.estimatedProtein ? Number(analysis.estimatedProtein) : null,
                fat: analysis.estimatedFat ? Number(analysis.estimatedFat) : null,
                carbohydrate: analysis.estimatedCarbs ? Number(analysis.estimatedCarbs) : null,
              },
            }
          : null,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};