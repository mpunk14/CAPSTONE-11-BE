import { Request, Response } from "express";
import { db } from "../db"; 
import { eq, inArray } from "drizzle-orm";
import { mealDocumentation, menus, schoolReports, schools, sppg } from "../db/skema";
import { isUuid } from "../utils/uuid";

type SppgRow = typeof sppg.$inferSelect;
type SchoolRow = typeof schools.$inferSelect;
type MenuRow = typeof menus.$inferSelect;
type ReportRow = typeof schoolReports.$inferSelect;

const formatDateLabel = (dateValue: string | Date) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
};

const averageRating = (reports: ReportRow[], fallback = 4.8) => {
  const ratings = reports
    .map((report) => report.rating)
    .filter((rating): rating is number => typeof rating === "number");

  if (!ratings.length) return fallback;
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return Number((total / ratings.length).toFixed(1));
};

const latestMenu = (menuRows: MenuRow[]) =>
  [...menuRows].sort((a, b) => String(b.menuDate).localeCompare(String(a.menuDate)))[0] ?? null;

const mapWeeklyMenu = (menuRows: MenuRow[]) =>
  [...menuRows]
    .sort((a, b) => String(b.menuDate).localeCompare(String(a.menuDate)))
    .slice(0, 7)
    .map((menu) => ({
      day: formatDateLabel(menu.menuDate),
      title: menu.rice ?? "Menu",
      items: [menu.rice, menu.sideDish, menu.fruit].filter(Boolean),
      image: null,
    }));

const mapSchoolForSppgProfile = (school: SchoolRow) => {
  if (typeof school.studentCount === "number") {
    return {
      ...school,
      name: school.schoolName,
      location: school.address,
      siswaTotal: school.studentCount,
      image: school.photoUrl,
      photoUrl: school.photoUrl,
      imageUrl: school.photoUrl,
    };
  }

  const seed = Number(school.npsn.slice(-2));
  const studentCount = Number.isFinite(seed) ? 300 + seed * 4 : 360;

  return {
    ...school,
    name: school.schoolName,
    location: school.address,
    studentCount,
    siswaTotal: studentCount,
    image: school.photoUrl,
    photoUrl: school.photoUrl,
    imageUrl: school.photoUrl,
  };
};

const enrichSppg = (
  sppgData: SppgRow,
  servedSchools: SchoolRow[] = [],
  menuRows: MenuRow[] = [],
  reports: ReportRow[] = [],
) => {
  const menu = latestMenu(menuRows);
  const totalPartnerSchools = servedSchools.length;
  const distributedPortions =
    sppgData.distributedPortions ??
    Math.min(
      sppgData.capacityPerDay ?? 0,
      servedSchools.reduce((total, school) => {
        const seed = Number(school.npsn.slice(-2));
        return total + (school.studentCount ?? (Number.isFinite(seed) ? 300 + seed * 4 : 360));
      }, 0),
    );

  return {
    ...sppgData,
    sppgName: sppgData.name,
    nama: sppgData.name,
    alamat: sppgData.address,
    kapasitas: sppgData.capacityPerDay,
    location: sppgData.address,
    totalPartnerSchools,
    schoolsServed: totalPartnerSchools,
    distributedPortions,
    totalDistributedPortions: distributedPortions,
    rating: averageRating(reports),
    averageRating: averageRating(reports),
    photoUrl: sppgData.photoUrl,
    imageUrl: sppgData.photoUrl,
    image: sppgData.photoUrl,
    description: `Unit SPPG aktif dengan kapasitas ${sppgData.capacityPerDay ?? 0} porsi per hari.`,
    longDescription: `${sppgData.name} melayani distribusi makan bergizi untuk ${totalPartnerSchools} sekolah mitra di wilayah sekitar ${sppgData.address}.`,
    staffCount: sppgData.staffCount ?? Math.max(12, Math.ceil((sppgData.capacityPerDay ?? 0) / 250)),
    menuPeriod: menuRows.length ? `${formatDateLabel(menuRows[0].menuDate)} - ${formatDateLabel(menuRows[menuRows.length - 1].menuDate)}` : "-",
    nutrition: {
      calories: menu?.calories ?? "-",
      protein: menu?.protein ?? "-",
      carbs: menu?.carbohydrate ?? "-",
      fat: menu?.fat ?? "-",
      fiber: "-",
    },
    weeklyMenu: mapWeeklyMenu(menuRows),
    schools: servedSchools.map(mapSchoolForSppgProfile),
  };
};

// GET semua data SPPG
export const getAllSppg = async (req: Request, res: Response): Promise<any> => {
  try {
    const [sppgRows, schoolRows, menuRows, reportRows] = await Promise.all([
      db.select().from(sppg),
      db.select().from(schools),
      db.select().from(menus),
      db.select().from(schoolReports),
    ]);

    const schoolsBySppgId = new Map<string, SchoolRow[]>();
    for (const school of schoolRows) {
      if (!school.sppgId) continue;
      schoolsBySppgId.set(school.sppgId, [...(schoolsBySppgId.get(school.sppgId) ?? []), school]);
    }

    const menusBySppgId = new Map<string, MenuRow[]>();
    for (const menu of menuRows) {
      menusBySppgId.set(menu.sppgId, [...(menusBySppgId.get(menu.sppgId) ?? []), menu]);
    }

    const reportsBySppgId = new Map<string, ReportRow[]>();
    for (const report of reportRows) {
      reportsBySppgId.set(report.sppgId, [...(reportsBySppgId.get(report.sppgId) ?? []), report]);
    }

    const data = sppgRows.map((item) =>
      enrichSppg(
        item,
        schoolsBySppgId.get(item.id) ?? [],
        menusBySppgId.get(item.id) ?? [],
        reportsBySppgId.get(item.id) ?? [],
      ),
    );
    
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
 
    if (!isUuid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Format ID SPPG tidak valid" 
      });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.id, id));

    if (!sppgData) {
      return res.status(404).json({ 
        success: false, 
        message: "Data SPPG tidak ditemukan" 
      });
    }

    const [servedSchools, menuRows, reportRows] = await Promise.all([
      db.select().from(schools).where(eq(schools.sppgId, id)),
      db.select().from(menus).where(eq(menus.sppgId, id)),
      db.select().from(schoolReports).where(eq(schoolReports.sppgId, id)),
    ]);
    const data = enrichSppg(sppgData, servedSchools, menuRows, reportRows);

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

export const getSppgDashboardSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.userId, userId));

    if (!sppgData) {
      return res.status(404).json({
        success: false,
        message: "Data SPPG milik user ini tidak ditemukan",
      });
    }

    const partnerSchools = await db.select({ id: schools.id }).from(schools).where(eq(schools.sppgId, sppgData.id));
    const todayMenus = await db.select({ id: menus.id }).from(menus).where(eq(menus.sppgId, sppgData.id));

    return res.status(200).json({
      success: true,
      data: {
        sppgName: sppgData.name,
        operationalStatus: sppgData.status,
        totalPartnerSchools: partnerSchools.length,
        totalMenus: todayMenus.length,
      },
    });
  } catch (error) {
    console.error("Error GET getSppgDashboardSummary:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const parseTargetSchoolIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === "string" ? [item] : []));
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) => (typeof item === "string" ? [item] : []));
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const createMealDocumentation = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
    const productionDate = typeof req.body.productionDate === "string" && req.body.productionDate.trim()
      ? req.body.productionDate.trim()
      : new Date().toISOString().slice(0, 10);
    const targetSchoolIds = parseTargetSchoolIds(req.body.targetSchoolIds);
    const file = req.file as Express.Multer.File & { secure_url?: string; path?: string; public_id?: string } | undefined;
    const photoUrl = file?.secure_url ?? file?.path;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!photoUrl) {
      return res.status(400).json({ success: false, message: "Foto dokumentasi wajib diunggah" });
    }

    if (!notes) {
      return res.status(400).json({ success: false, message: "Notes wajib diisi" });
    }

    if (!targetSchoolIds.length) {
      return res.status(400).json({ success: false, message: "targetSchoolIds wajib diisi" });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.userId, userId));

    if (!sppgData) {
      return res.status(404).json({ success: false, message: "Data SPPG milik user ini tidak ditemukan" });
    }

    const validSchools = await db.select({ id: schools.id }).from(schools).where(inArray(schools.id, targetSchoolIds));
    const validSchoolIds = new Set(validSchools.map((item) => item.id));
    const invalidSchoolIds = targetSchoolIds.filter((id) => !validSchoolIds.has(id));

    if (invalidSchoolIds.length) {
      return res.status(400).json({
        success: false,
        message: "Ada targetSchoolIds yang tidak valid",
        invalidSchoolIds,
      });
    }

    const inserted = await Promise.all(
      targetSchoolIds.map((targetSchoolId) =>
        db
          .insert(mealDocumentation)
          .values({
            sppgId: sppgData.id,
            targetSchoolId,
            productionDate,
            photoUrl,
            notes,
            uploadedByRole: "sppg",
          })
          .returning(),
      ),
    );

    const data = inserted.flat();

    return res.status(201).json({
      success: true,
      message: "Dokumentasi makanan berhasil disimpan",
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
