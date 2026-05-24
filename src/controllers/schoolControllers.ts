import { Request, Response } from "express";
import { db } from "../db/index"; 
import { desc, eq } from "drizzle-orm";
import { mealDocumentation, menus, notifications, schoolReports, schools, sppg } from "../db/skema";
import { isUuid } from "../utils/uuid";

type SchoolRow = typeof schools.$inferSelect;
type SppgRow = typeof sppg.$inferSelect;
type MenuRow = typeof menus.$inferSelect;
type ReportRow = typeof schoolReports.$inferSelect;
type DocumentationRow = typeof mealDocumentation.$inferSelect;
type NotificationRow = typeof notifications.$inferSelect;

const formatDateLabel = (dateValue: string | Date) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
};

const createStudentCount = (school: SchoolRow) => {
  if (typeof school.studentCount === "number") return school.studentCount;
  const seed = Number(school.npsn.slice(-2));
  return Number.isFinite(seed) ? 300 + seed * 4 : 360;
};

const averageRating = (reports: ReportRow[], fallback = 4.8) => {
  const ratings = reports
    .map((report) => report.rating)
    .filter((rating): rating is number => typeof rating === "number");

  if (!ratings.length) return fallback;
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return Number((total / ratings.length).toFixed(1));
};

const getLatestMenu = (menuRows: MenuRow[]) => {
  return [...menuRows].sort((a, b) => String(b.menuDate).localeCompare(String(a.menuDate)))[0] ?? null;
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
    const direct = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
    if (direct) return trimmed;

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

const getTodayMenu = (menuRows: MenuRow[]) => {
  const todayIso = getTodayIsoDateWib();
  const todayMenus = menuRows.filter((menu) => toIsoDate(menu.menuDate) === todayIso);
  if (!todayMenus.length) return null;

  // Prioritaskan menu yang benar-benar berisi nama hidangan.
  const withContent = todayMenus.filter(
    (menu) =>
      Boolean(menu.rice && String(menu.rice).trim()) ||
      Boolean(menu.sideDish && String(menu.sideDish).trim()) ||
      Boolean(menu.fruit && String(menu.fruit).trim()),
  );

  const pickFrom = withContent.length ? withContent : todayMenus;
  return [...pickFrom].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null;
};

const getBestMenuForDisplay = (menuRows: MenuRow[]) => {
  const todayMenu = getTodayMenu(menuRows);
  const hasContent =
    todayMenu &&
    (Boolean(todayMenu.rice && String(todayMenu.rice).trim()) ||
      Boolean(todayMenu.sideDish && String(todayMenu.sideDish).trim()) ||
      Boolean(todayMenu.fruit && String(todayMenu.fruit).trim()));

  if (hasContent) return todayMenu;

  // Fallback: ambil menu terbaru yang punya isi agar tidak menampilkan "-" semua.
  const validMenus = menuRows.filter(
    (menu) =>
      Boolean(menu.rice && String(menu.rice).trim()) ||
      Boolean(menu.sideDish && String(menu.sideDish).trim()) ||
      Boolean(menu.fruit && String(menu.fruit).trim()),
  );

  return [...validMenus].sort((a, b) => String(b.menuDate).localeCompare(String(a.menuDate)))[0] ?? null;
};

const mapMenuToDailyItem = (menu: MenuRow, index: number) => ({
  hari: formatDateLabel(menu.menuDate),
  isToday: index === 0,
  menu: [menu.rice, menu.sideDish, menu.fruit].filter(Boolean),
});

const mapNutrition = (menu: MenuRow | null) => [
  { lbl: "KALORI", val: menu?.calories ?? "-", unit: "kcal" },
  { lbl: "PROTEIN", val: menu?.protein ?? "-", unit: "g" },
  { lbl: "KARBOHIDRAT", val: menu?.carbohydrate ?? "-", unit: "g" },
  { lbl: "LEMAK", val: menu?.fat ?? "-", unit: "g" },
  { lbl: "SERAT", val: menu?.fiber ?? "-", unit: "g" },
];

const mapDocumentation = (docs: DocumentationRow[]) =>
  docs.map((doc) => ({
    id: doc.id,
    foto: doc.photoUrl,
    fotoUrl: doc.photoUrl,
    caption: doc.notes ?? "Dokumentasi menu",
    productionDate: doc.productionDate,
    createdAt: doc.createdAt,
  }));

const mapNotificationsToNotes = (items: NotificationRow[]) =>
  items.map((item) => ({
    id: item.id,
    type: item.type === "complaint" ? "warning" : "success",
    judul: item.message,
    meta: `${formatDateLabel(item.createdAt)} - ${item.status}`,
    kutipan: item.type,
  }));

const mapSchoolReportNotes = (reports: ReportRow[]) =>
  reports.map((report) => ({
    id: report.id,
    type: report.status === "submitted" ? "warning" : "success",
    judul: report.note,
    meta: `${formatDateLabel(report.submittedAt)} - Rating ${report.rating ?? "-"}`,
    kutipan: report.status,
  }));

const createSchoolNotification = async (school: SchoolRow, message: string) => {
  if (!school.sppgId) return;

  await db.insert(notifications).values({
    sppgId: school.sppgId,
    schoolId: school.id,
    type: "notification",
    message,
    status: "new",
  });
};

const normalizeSppgForSchool = (partnerSppg: SppgRow | null) => {
  if (!partnerSppg) return null;

  return {
    ...partnerSppg,
    sppgId: partnerSppg.id,
    sppgName: partnerSppg.name,
    nama: partnerSppg.name,
    alamat: partnerSppg.address,
    kapasitas: partnerSppg.capacityPerDay,
  };
};

const enrichSchool = (
  school: SchoolRow,
  partnerSppg: SppgRow | null,
  menuRows: MenuRow[] = [],
  reports: ReportRow[] = [],
) => {
  const todayMenu = getBestMenuForDisplay(menuRows);
  const studentCount = createStudentCount(school);
  const sppgName = partnerSppg?.name ?? null;

  return {
    ...school,
    nama: school.schoolName,
    alamat: school.address,
    siswa: studentCount,
    studentCount,
    studentsCount: studentCount,
    jumlahSiswa: studentCount,
    status: "Aktif",
    foto: school.photoUrl,
    photoUrl: school.photoUrl,
    imageUrl: school.photoUrl,
    sppgName,
    partnerSppgName: sppgName,
    affiliatedKitchen: sppgName,
    sppg: normalizeSppgForSchool(partnerSppg),
    menuLabel: "Menu Hari Ini",
    menuTitle: todayMenu?.rice ?? "Belum ada menu hari ini",
    todayMenuTitle: todayMenu?.rice ?? "Belum ada menu hari ini",
    menuDetail: todayMenu
      ? [todayMenu.sideDish, todayMenu.fruit].filter(Boolean).join(", ")
      : "Data menu belum tersedia",
    todayMenuDetail: todayMenu
      ? [todayMenu.sideDish, todayMenu.fruit].filter(Boolean).join(", ")
      : "Data menu belum tersedia",
    calories: todayMenu?.calories ? `${todayMenu.calories} kcal` : "-",
    nutrition: todayMenu?.protein ? `Protein ${todayMenu.protein}g` : "Target Nutrisi: -",
    menuImage: todayMenu?.menuImageUrl ?? null,
    menuImageUrl: todayMenu?.menuImageUrl ?? null,
    rating: averageRating(reports),
  };
};

const getSchoolOrResponse = async (id: string, res: Response) => {
  if (!isUuid(id)) {
    res.status(400).json({
      success: false,
      message: "Format ID Sekolah tidak valid",
    });
    return null;
  }

  const [school] = await db.select().from(schools).where(eq(schools.id, id));
  if (!school) {
    res.status(404).json({
      success: false,
      message: "Data Sekolah tidak ditemukan",
    });
    return null;
  }

  return school;
};

// GET semua data sekolah
export const getAllSekolah = async (req: Request, res: Response): Promise<any> => {
  try {
    const [schoolRows, sppgRows, menuRows, reportRows] = await Promise.all([
      db.select().from(schools),
      db.select().from(sppg),
      db.select().from(menus),
      db.select().from(schoolReports),
    ]);

    const sppgById = new Map(sppgRows.map((item) => [item.id, item]));
    const menusBySppgId = new Map<string, MenuRow[]>();
    for (const menu of menuRows) {
      menusBySppgId.set(menu.sppgId, [...(menusBySppgId.get(menu.sppgId) ?? []), menu]);
    }

    const reportsBySchoolId = new Map<string, ReportRow[]>();
    for (const report of reportRows) {
      reportsBySchoolId.set(report.schoolId, [...(reportsBySchoolId.get(report.schoolId) ?? []), report]);
    }

    const data = schoolRows.map((school) =>
      enrichSchool(
        school,
        school.sppgId ? sppgById.get(school.sppgId) ?? null : null,
        school.sppgId ? menusBySppgId.get(school.sppgId) ?? [] : [],
        reportsBySchoolId.get(school.id) ?? [],
      ),
    );
    
    return res.status(200).json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error("Error GET getAllSekolah:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

// GET detail sekolah berdasarkan ID + nama SPPG mitra
export const getSekolahById = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const school = await getSchoolOrResponse(id, res);
    if (!school) return;

    let partnerSppg = null;
    if (school.sppgId) {
      const [foundSppg] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));
      partnerSppg = foundSppg ?? null;
    }

    const [menuRows, reportRows] = await Promise.all([
      school.sppgId ? db.select().from(menus).where(eq(menus.sppgId, school.sppgId)) : Promise.resolve([]),
      db.select().from(schoolReports).where(eq(schoolReports.schoolId, school.id)),
    ]);
    const data = enrichSchool(school, partnerSppg, menuRows, reportRows);

    return res.status(200).json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error("Error GET getSekolahById:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

export const getSekolahSppg = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id as string, res);
    if (!school) return;

    if (!school.sppgId) {
      return res.status(200).json({ success: true, data: null });
    }

    const [partnerSppg] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));
    return res.status(200).json({ success: true, data: normalizeSppgForSchool(partnerSppg ?? null) });
  } catch (error) {
    console.error("Error GET getSekolahSppg:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSekolahMenuHarian = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id as string, res);
    if (!school) return;

    if (!school.sppgId) return res.status(200).json({ success: true, data: [] });

    const menuRows = await db.select().from(menus).where(eq(menus.sppgId, school.sppgId));
    const data = [...menuRows]
      .sort((a, b) => String(b.menuDate).localeCompare(String(a.menuDate)))
      .slice(0, 7)
      .map(mapMenuToDailyItem);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error GET getSekolahMenuHarian:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSekolahDokumentasi = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id as string, res);
    if (!school) return;

    const docs = await db
      .select()
      .from(mealDocumentation)
      .where(eq(mealDocumentation.targetSchoolId, school.id))
      .orderBy(desc(mealDocumentation.createdAt));

    return res.status(200).json({ success: true, data: mapDocumentation(docs) });
  } catch (error) {
    console.error("Error GET getSekolahDokumentasi:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSekolahNutrisi = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id as string, res);
    if (!school) return;

    if (!school.sppgId) return res.status(200).json({ success: true, data: mapNutrition(null) });

    const menuRows = await db.select().from(menus).where(eq(menus.sppgId, school.sppgId));
    return res.status(200).json({ success: true, data: mapNutrition(getBestMenuForDisplay(menuRows)) });
  } catch (error) {
    console.error("Error GET getSekolahNutrisi:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSekolahCatatan = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id as string, res);
    if (!school) return;

    const [reportRows, notificationRows] = await Promise.all([
      db.select().from(schoolReports).where(eq(schoolReports.schoolId, school.id)),
      db.select().from(notifications).where(eq(notifications.schoolId, school.id)),
    ]);

    return res.status(200).json({
      success: true,
      data: [...mapSchoolReportNotes(reportRows), ...mapNotificationsToNotes(notificationRows)],
    });
  } catch (error) {
    console.error("Error GET getSekolahCatatan:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createSekolahDokumentasi = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id as string, res);
    if (!school) return;

    if (!school.sppgId) {
      return res.status(400).json({ success: false, message: "Sekolah belum terhubung ke SPPG" });
    }

    const photoUrl = req.body.photoUrl ?? req.body.fotoUrl ?? req.body.url;
    if (!photoUrl) {
      return res.status(400).json({ success: false, message: "photoUrl wajib diisi" });
    }

    const caption = String(req.body.caption ?? req.body.notes ?? "Dokumentasi menu").trim();

    const [inserted] = await db
      .insert(mealDocumentation)
      .values({
        sppgId: school.sppgId,
        targetSchoolId: school.id,
        productionDate: new Date().toISOString().slice(0, 10),
        photoUrl,
        notes: caption || "Dokumentasi menu",
        uploadedByRole: "school",
      })
      .returning();

    await createSchoolNotification(
      school,
      `${school.schoolName || "Sekolah"} mengunggah dokumentasi menu${caption ? `: ${caption}` : ""}`,
    );

    return res.status(201).json({ success: true, data: mapDocumentation([inserted])[0] });
  } catch (error) {
    console.error("Error POST createSekolahDokumentasi:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createSekolahCatatan = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id as string, res);
    if (!school) return;

    if (!school.sppgId) {
      return res.status(400).json({ success: false, message: "Sekolah belum terhubung ke SPPG" });
    }

    const note = req.body.title ?? req.body.message ?? req.body.note;
    if (!note) return res.status(400).json({ success: false, message: "Catatan wajib diisi" });

    const normalizedNote = String(note).trim();
    if (!normalizedNote) {
      return res.status(400).json({ success: false, message: "Catatan wajib diisi" });
    }

    const [inserted] = await db
      .insert(schoolReports)
      .values({
        schoolId: school.id,
        sppgId: school.sppgId,
        note: normalizedNote,
        rating: req.body.rating ?? null,
        status: "submitted",
      })
      .returning();

    await createSchoolNotification(
      school,
      `${school.schoolName || "Sekolah"} mengirimkan catatan pengiriman: ${normalizedNote}`,
    );

    return res.status(201).json({ success: true, data: mapSchoolReportNotes([inserted])[0] });
  } catch (error) {
    console.error("Error POST createSekolahCatatan:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSchoolDashboardSummary = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [school] = await db.select().from(schools).where(eq(schools.userId, userId));

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "Data sekolah milik user ini tidak ditemukan",
      });
    }

    let partnerSppg = null;
    if (school.sppgId) {
      const [foundSppg] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));
      partnerSppg = foundSppg
        ? {
            sppgId: foundSppg.id,
            sppgName: foundSppg.name,
            address: foundSppg.address,
          }
        : null;
    }

    const reportCount = await db.select({ id: schoolReports.id }).from(schoolReports).where(eq(schoolReports.schoolId, school.id));

    return res.status(200).json({
      success: true,
      data: {
        schoolName: school.schoolName,
        address: school.address,
        partnerSppg,
        totalReports: reportCount.length,
      },
    });
  } catch (error) {
    console.error("Error GET getSchoolDashboardSummary:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};