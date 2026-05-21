import { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { menuUploadHistory, menus, sppg } from "../db/skema";
import { CsvValidationError, parseMenuCsvContent } from "../services/csvParserService";

const buildUploadHistoryPayload = (params: {
  sppgId: string;
  fileName: string;
  status: "success" | "failed";
  rowCount?: number;
  errorMessage?: string | null;
}) => ({
  sppgId: params.sppgId,
  fileName: params.fileName,
  status: params.status,
  rowCount: params.rowCount ?? 0,
  errorMessage: params.errorMessage ?? null,
});

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

    const insertedMenus = await db
      .insert(menus)
      .values(
        parsedRows.map((row) => ({
          sppgId: sppgData.id,
          menuDate: row.menuDate,
          rice: row.rice,
          sideDish: row.sideDish,
          fruit: row.fruit,
          calories: row.calories,
          protein: row.protein,
          carbohydrate: row.carbohydrate,
          fat: row.fat,
        })),
      )
      .returning();

    await db.insert(menuUploadHistory).values(
      buildUploadHistoryPayload({
        sppgId: sppgData.id,
        fileName,
        status: "success",
        rowCount: insertedMenus.length,
      }),
    );

    return res.status(201).json({
      success: true,
      message: "CSV menu berhasil diunggah",
      data: {
        fileName,
        uploadedRows: insertedMenus.length,
      },
    });
  } catch (error) {
    try {
      const sppgData = req.user?.id ? await getAuthenticatedSppg(req.user.id) : null;

      if (sppgData) {
        await db.insert(menuUploadHistory).values(
          buildUploadHistoryPayload({
            sppgId: sppgData.id,
            fileName,
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      }
    } catch (historyError) {
      console.error("Failed to record menu upload history:", historyError);
    }

    if (error instanceof CsvValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getMenuRiwayat = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const sppgIdQuery = typeof req.query.sppg_id === "string" ? req.query.sppg_id : undefined;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sppgData = await getAuthenticatedSppg(userId);
    if (!sppgData) {
      return res.status(404).json({ success: false, message: "Data SPPG milik user ini tidak ditemukan" });
    }

    if (sppgIdQuery && sppgIdQuery !== sppgData.id) {
      return res.status(403).json({ success: false, message: "Akses riwayat upload ini ditolak" });
    }

    const data = await db
      .select({
        uploadDate: menuUploadHistory.uploadedAt,
        fileName: menuUploadHistory.fileName,
        status: menuUploadHistory.status,
        rowCount: menuUploadHistory.rowCount,
      })
      .from(menuUploadHistory)
      .where(eq(menuUploadHistory.sppgId, sppgData.id))
      .orderBy(desc(menuUploadHistory.uploadedAt));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
