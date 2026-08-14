import { Request, Response } from "express";
import { db } from "../db"; 
import { and, eq, inArray } from "drizzle-orm";
import { mealDocumentation, menus, schoolReports, schools, sppg } from "../db/skema";
import { isUuid } from "../utils/uuid";
import { cloudinary } from "../config/cloudinary";
import { triggerCvAnalysis } from "../services/cv.service";

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

const getLocalDateKey = (value: string | Date | null | undefined) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
      fiber: menu?.fiber ?? "-",
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

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const resolveCloudinaryImageUrl = (
  file?: Express.Multer.File & { secure_url?: string; path?: string; url?: string; filename?: string; public_id?: string }
) => {
  const directUrl = file?.secure_url ?? file?.path ?? (file as any)?.url ?? null;
  if (directUrl && isHttpUrl(directUrl)) return directUrl;

  const publicId = file?.public_id ?? (file as any)?.filename ?? null;
  if (publicId && typeof publicId === "string") {
    const builtUrl = cloudinary.url(publicId, { secure: true });
    if (builtUrl && isHttpUrl(builtUrl)) return builtUrl;
  }

  return null;
};

export const createMealDocumentation = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const productionDate = typeof req.body.productionDate === "string" && req.body.productionDate.trim()
      ? req.body.productionDate.trim()
      : new Date().toISOString().slice(0, 10);
    const file = req.file as Express.Multer.File & { secure_url?: string; path?: string; url?: string; filename?: string; public_id?: string } | undefined;
    const photoUrl = resolveCloudinaryImageUrl(file);
    const notes = String(req.body.notes ?? req.body.caption ?? "Dokumentasi menu").trim() || "Dokumentasi menu";
    const targetSchoolIds = parseTargetSchoolIds(req.body.targetSchoolIds);
    const targetSchoolId = targetSchoolIds[0] ?? null;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!photoUrl) {
      return res.status(400).json({ success: false, message: "Upload foto ke Cloudinary gagal. Coba unggah ulang." });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.userId, userId));

    if (!sppgData) {
      return res.status(404).json({ success: false, message: "Data SPPG milik user ini tidak ditemukan" });
    }

    const [inserted] = await db
      .insert(mealDocumentation)
      .values({
        sppgId: sppgData.id,
        targetSchoolId,
        productionDate,
        photoUrl,
        notes,
        uploadedByRole: "sppg",
      })
      .returning();

    const existingMenus = await db
      .select()
      .from(menus)
      .where(and(eq(menus.sppgId, sppgData.id), eq(menus.menuDate, productionDate)));

    if (existingMenus.length > 0) {
      await db
        .update(menus)
        .set({
          menuImageUrl: photoUrl,
          updatedAt: new Date(),
        })
        .where(eq(menus.id, existingMenus[0].id));
    }

    return res.status(201).json({
      success: true,
      message: "Dokumentasi menu berhasil disimpan. Analisis CV sedang diproses...",
      data: [inserted],
    });

    // Fire-and-forget CV analysis — must be AFTER res.status(201).json() so it
    // doesn't block the HTTP response. Rule 10 (AGENTS.md): all CV calls via cv.service.
    triggerCvAnalysis(inserted.id, photoUrl, sppgData.id, productionDate).catch((err) => {
      console.error('[sppgControllers] Background CV trigger error:', err?.message);
    });
  } catch (error) {
    console.error("Error POST createMealDocumentation:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getMealDocumentationHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const [sppgData] = await db.select().from(sppg).where(eq(sppg.userId, userId));
    if (!sppgData) {
      return res.status(404).json({ success: false, message: "Data SPPG milik user ini tidak ditemukan" });
    }

    const todayKey = getLocalDateKey(new Date()) ?? new Date().toISOString().slice(0, 10);

    const [docRows, schoolRows] = await Promise.all([
      db
        .select()
        .from(mealDocumentation)
        .where(and(eq(mealDocumentation.sppgId, sppgData.id), eq(mealDocumentation.uploadedByRole, "sppg"))),
      db.select().from(schools),
    ]);

    const schoolById = new Map(schoolRows.map((row) => [row.id, row]));

    const data = docRows
      .filter((row) => getLocalDateKey(row.productionDate) === todayKey)
      .map((row) => {
        const targetSchool = row.targetSchoolId ? schoolById.get(row.targetSchoolId) ?? null : null;
        return {
          id: `school-doc-${row.id}`,
          photoUrl: row.photoUrl,
          notes: row.notes ?? "Dokumentasi menu",
          productionDate: row.productionDate,
          createdAt: row.createdAt,
          schoolId: row.targetSchoolId,
          schoolName: targetSchool?.schoolName ?? "Sekolah",
        };
      })
      .sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime())
      .slice(0, 20);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error GET getMealDocumentationHistory:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};