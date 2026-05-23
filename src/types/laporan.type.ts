export type LaporanStatus = "submitted" | "received" | "reviewed";

export interface CreateLaporanDTO {
  schoolId: string;
  sppgId: string;
  note: string;
  rating?: number | null;
  status: LaporanStatus;
}

export interface LaporanFilters {
  schoolId?: string;
  sppgId?: string;
}
