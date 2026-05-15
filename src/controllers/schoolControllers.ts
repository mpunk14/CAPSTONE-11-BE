import { Request, Response } from "express";
import { db } from "../db/index"; 
import { eq } from "drizzle-orm";
import { mealDocumentation, menus, schoolReports, schools, sppg } from "../db/skema";
import { isUuid } from "../utils/uuid";

type SchoolRow = typeof schools.$inferSelect;
type SppgRow = typeof sppg.$inferSelect;
type MenuRow = typeof menus.$inferSelect;

const today = () => new Date().toISOString().slice(0, 10);

const getString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const mapMenuTitle = (menu: MenuRow | null) => {
  if (!menu) return "Menu belum tersedia";

  return [menu.rice, menu.sideDish, menu.fruit].filter(Boolean).join(", ");
};

const mapMenuDetail = (menu: MenuRow | null) => {
  if (!menu) return "Detail menu belum tersedia";

  return `Tanggal ${menu.menuDate}`;
};

const mapNutrition = (menu: MenuRow | null) => {
  if (!menu) return "Target Nutrisi: -";

  return `Protein ${menu.protein ?? "-"}g | Karbo ${menu.carbohydrate ?? "-"}g | Lemak ${menu.fat ?? "-"}g`;
};

const findDisplayMenu = (menuData: MenuRow[]) => {
  const sorted = menuData.sort((a, b) => String(b.menuDate).localeCompare(String(a.menuDate)));
  return sorted.find((item) => String(item.menuDate) === today()) ?? sorted[0] ?? null;
};

const mapSchoolForFe = (school: SchoolRow, partnerSppg: SppgRow | null = null, menu: MenuRow | null = null) => ({
  ...school,
  name: school.schoolName,
  nama: school.schoolName,
  alamat: school.address,
  studentCount: 0,
  studentsCount: 0,
  jumlahSiswa: 0,
  siswa: 0,
  photoUrl: null,
  foto: null,
  sppgName: partnerSppg?.name ?? null,
  partnerSppgName: partnerSppg?.name ?? null,
  affiliatedKitchen: partnerSppg?.name ?? null,
  sppg: mapSppgForFe(partnerSppg),
  menuTitle: mapMenuTitle(menu),
  todayMenuTitle: mapMenuTitle(menu),
  menuDetail: mapMenuDetail(menu),
  todayMenuDetail: mapMenuDetail(menu),
  calories: menu?.calories ?? "-",
  nutrition: mapNutrition(menu),
});

const mapSppgForFe = (item: SppgRow | null) => {
  if (!item) return null;

  return {
    ...item,
    staffCount: 0,
  };
};

const getSchoolOrResponse = async (id: unknown, res: Response) => {
  const schoolId = getString(id);

  if (!schoolId) {
    res.status(400).json({ success: false, message: "Format ID Sekolah tidak valid" });
    return null;
  }

  if (!isUuid(schoolId)) {
    res.status(400).json({ success: false, message: "Format ID Sekolah tidak valid" });
    return null;
  }

  const [school] = await db.select().from(schools).where(eq(schools.id, schoolId));

  if (!school) {
    res.status(404).json({ success: false, message: "Data Sekolah tidak ditemukan" });
    return null;
  }

  return school;
};

const getMenusForSchool = async (school: SchoolRow) => {
  if (!school.sppgId) return [];

  const data = await db.select().from(menus).where(eq(menus.sppgId, school.sppgId));
  const sorted = data.sort((a, b) => String(b.menuDate).localeCompare(String(a.menuDate)));
  const todayMenu = sorted.filter((item) => String(item.menuDate) === today());

  return todayMenu.length > 0 ? todayMenu : sorted.slice(0, 1);
};

const parseRating = (value: unknown): number | null | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
};

// GET semua data sekolah
export const getAllSekolah = async (req: Request, res: Response): Promise<any> => {
  try {
    const schoolData = await db.select().from(schools);
    const sppgData = await db.select().from(sppg);
    const menuData = await db.select().from(menus);
    const data = schoolData.map((school) => {
      const partnerSppg = sppgData.find((item) => item.id === school.sppgId) ?? null;
      const schoolMenus = partnerSppg ? menuData.filter((menu) => menu.sppgId === partnerSppg.id) : [];
      return mapSchoolForFe(school, partnerSppg, findDisplayMenu(schoolMenus));
    });
    
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

    if (!isUuid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Format ID Sekolah tidak valid" 
      });
    }

    const [school] = await db.select().from(schools).where(eq(schools.id, id));

    if (!school) {
      return res.status(404).json({ 
        success: false, 
        message: "Data Sekolah tidak ditemukan" 
      });
    }

    let partnerSppg = null;
    if (school.sppgId) {
      const [foundSppg] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));
      partnerSppg = foundSppg ?? null;
    }

    const schoolMenus = partnerSppg ? await db.select().from(menus).where(eq(menus.sppgId, partnerSppg.id)) : [];
    const data = mapSchoolForFe(school, partnerSppg, findDisplayMenu(schoolMenus));

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
    const school = await getSchoolOrResponse(req.params.id, res);
    if (!school) return;

    if (!school.sppgId) {
      return res.status(200).json({ success: true, data: null });
    }

    const [partnerSppg] = await db.select().from(sppg).where(eq(sppg.id, school.sppgId));

    return res.status(200).json({
      success: true,
      data: mapSppgForFe(partnerSppg ?? null),
    });
  } catch (error) {
    console.error("Error GET getSekolahSppg:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSekolahMenuHarian = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id, res);
    if (!school) return;

    const data = await getMenusForSchool(school);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error GET getSekolahMenuHarian:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSekolahDokumentasi = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id, res);
    if (!school) return;

    const data = (await db.select().from(mealDocumentation)).filter((item) => {
      return item.targetSchoolId === school.id || (item.targetSchoolId === null && item.sppgId === school.sppgId);
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error GET getSekolahDokumentasi:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSekolahNutrisi = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id, res);
    if (!school) return;

    const data = (await getMenusForSchool(school)).map((item) => ({
      id: item.id,
      menuDate: item.menuDate,
      calories: item.calories,
      protein: item.protein,
      carbohydrate: item.carbohydrate,
      fat: item.fat,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error GET getSekolahNutrisi:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSekolahCatatan = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id, res);
    if (!school) return;

    const data = await db.select().from(schoolReports).where(eq(schoolReports.schoolId, school.id));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error GET getSekolahCatatan:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createSekolahDokumentasi = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id, res);
    if (!school) return;

    if (!school.sppgId) {
      return res.status(400).json({ success: false, message: "Sekolah belum memiliki SPPG" });
    }

    const photoUrl = getString(req.body.photoUrl) ?? getString(req.body.foto) ?? getString(req.body.url);
    const notes = getString(req.body.notes) ?? getString(req.body.catatan);
    const productionDate = getString(req.body.productionDate) ?? getString(req.body.tanggal) ?? today();

    if (!photoUrl) {
      return res.status(400).json({ success: false, message: "photoUrl wajib diisi" });
    }

    const [data] = await db
      .insert(mealDocumentation)
      .values({
        sppgId: school.sppgId,
        targetSchoolId: school.id,
        productionDate,
        photoUrl,
        notes: notes ?? null,
        uploadedByRole: "school",
      })
      .returning();

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Error POST createSekolahDokumentasi:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createSekolahCatatan = async (req: Request, res: Response): Promise<any> => {
  try {
    const school = await getSchoolOrResponse(req.params.id, res);
    if (!school) return;

    if (!school.sppgId) {
      return res.status(400).json({ success: false, message: "Sekolah belum memiliki SPPG" });
    }

    const note = getString(req.body.note) ?? getString(req.body.catatan);
    const rating = parseRating(req.body.rating);

    if (!note) {
      return res.status(400).json({ success: false, message: "Catatan wajib diisi" });
    }

    if (rating === null) {
      return res.status(400).json({ success: false, message: "Rating harus berupa angka 1 sampai 5" });
    }

    const [data] = await db
      .insert(schoolReports)
      .values({
        schoolId: school.id,
        sppgId: school.sppgId,
        note,
        rating: rating ?? null,
        status: "submitted",
      })
      .returning();

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Error POST createSekolahCatatan:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
