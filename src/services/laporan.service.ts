import { eq } from "drizzle-orm";
import { db } from "../db";
import { schoolReports } from "../db/skema";
import { CreateLaporanDTO, LaporanFilters } from "../types/laporan.type";

export const createLaporanService = async (data: CreateLaporanDTO) => {
  const [newLaporan] = await db
    .insert(schoolReports)
    .values({
      schoolId: data.schoolId,
      sppgId: data.sppgId,
      note: data.note,
      rating: data.rating ?? null,
      status: data.status,
    })
    .returning();

  return newLaporan;
};

export const getSemuaLaporanService = async (filters: LaporanFilters = {}) => {
  let result = await db.select().from(schoolReports);

  if (filters.sppgId) {
    result = result.filter((report) => report.sppgId === filters.sppgId);
  }
  
  if (filters.schoolId) {
    result = result.filter((report) => report.schoolId === filters.schoolId);
  }

  return result;
};

export const getLaporanByIdService = async (id: string) => {
  const [report] = await db.select().from(schoolReports).where(eq(schoolReports.id, id));
  return report;
};
