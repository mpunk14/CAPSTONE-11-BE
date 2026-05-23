import { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { menus, sppg } from "../db/skema";
import { CsvValidationError, parseMenuCsvContent, parseNutritionCsvContent } from "../services/csvParserService";

const getCsvFile = (req: Request) => req.file as Express.Multer.File | undefined;

const getAuthenticatedSppg = async (userId: string) => {
  const [sppgData] = await db.select().from(sppg).where(eq(sppg.userId, userId));
  return sppgData ?? null;
};

export const uploadMenuCsv = async (req: Request, res: Response): Promise<any> => {
  const file = getCsvFile(req);
  const fileName = file?.originalname ?? "unknown.csv";

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "File CSV wajib diunggah" });
    }

    const sppgData = await getAuthenticatedSppg(userId);
    if (!sppgData) {
      return res.status(404).json({ success: false, message: "Data SPPG milik user ini tidak ditemukan" });
    }

    const csvContent = file.buffer.toString("utf-8");
    const parsedRows = parseMenuCsvContent(csvContent);

    let insertedRows = 0;
    let updatedRows = 0;

    for (const row of parsedRows) {
      const existing = await db
        .select({ id: menus.id })
        .from(menus)
        .where(and(eq(menus.sppgId, sppgData.id), eq(menus.menuDate, row.menuDate)));

      if (existing.length > 0) {
        await db
          .update(menus)
          .set({
            rice: row.rice,
            sideDish: row.sideDish,
            fruit: row.fruit,
            calories: row.calories ?? undefined,
            protein: row.protein ?? undefined,
            carbohydrate: row.carbohydrate ?? undefined,
            fat: row.fat ?? undefined,
            fiber: row.fiber ?? undefined,
          })
          .where(and(eq(menus.sppgId, sppgData.id), eq(menus.menuDate, row.menuDate)));
        updatedRows += 1;
      } else {
        await db.insert(menus).values({
          sppgId: sppgData.id,
          menuDate: row.menuDate,
          rice: row.rice,
          sideDish: row.sideDish,
          fruit: row.fruit,
          calories: row.calories ?? null,
          protein: row.protein ?? null,
          carbohydrate: row.carbohydrate ?? null,
          fat: row.fat ?? null,
          fiber: row.fiber ?? null,
        });
        insertedRows += 1;
      }
    }

    return res.status(201).json({
      success: true,
      message: "CSV menu berhasil diunggah",
      data: {
        fileName,
        uploadedRows: parsedRows.length,
        insertedRows,
        updatedRows,
      },
    });
  } catch (error) {
    if (error instanceof CsvValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const uploadNutritionCsv = async (req: Request, res: Response): Promise<any> => {
  const file = getCsvFile(req);
  const fileName = file?.originalname ?? "unknown.csv";

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "File CSV wajib diunggah" });
    }

    const sppgData = await getAuthenticatedSppg(userId);
    if (!sppgData) {
      return res.status(404).json({ success: false, message: "Data SPPG milik user ini tidak ditemukan" });
    }

    const csvContent = file.buffer.toString("utf-8");
    const rows = parseNutritionCsvContent(csvContent);

    let updatedRows = 0;
    let insertedRows = 0;

    for (const row of rows) {
      const existing = await db
        .select({ id: menus.id })
        .from(menus)
        .where(and(eq(menus.sppgId, sppgData.id), eq(menus.menuDate, row.menuDate)));

      if (existing.length > 0) {
        await db
          .update(menus)
          .set({
            calories: row.calories,
            protein: row.protein,
            carbohydrate: row.carbohydrate,
            fat: row.fat,
            fiber: row.fiber,
          })
          .where(and(eq(menus.sppgId, sppgData.id), eq(menus.menuDate, row.menuDate)));
        updatedRows += 1;
      } else {
        await db.insert(menus).values({
          sppgId: sppgData.id,
          menuDate: row.menuDate,
          rice: null,
          sideDish: null,
          fruit: null,
          calories: row.calories,
          protein: row.protein,
          carbohydrate: row.carbohydrate,
          fat: row.fat,
          fiber: row.fiber,
        });
        insertedRows += 1;
      }
    }

    return res.status(201).json({
      success: true,
      message: "CSV nutrisi berhasil diunggah",
      data: {
        fileName,
        uploadedRows: rows.length,
        updatedRows,
        insertedRows,
      },
    });
  } catch (error) {
    if (error instanceof CsvValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getMenuRiwayat = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sppgData = await getAuthenticatedSppg(userId);
    if (!sppgData) {
      return res.status(404).json({ success: false, message: "Data SPPG milik user ini tidak ditemukan" });
    }

    const rows = await db
      .select({
        uploadDate: menus.updatedAt,
      })
      .from(menus)
      .where(eq(menus.sppgId, sppgData.id))
      .orderBy(desc(menus.updatedAt));

    const data = rows.map((row) => ({
      uploadDate: row.uploadDate,
      fileName: "menu-upload.csv",
      status: "success",
      rowCount: 1,
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
