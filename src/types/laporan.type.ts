export type LaporanStatus = "submitted" | "received" | "reviewed";

export interface CreateLaporanDTO {
  schoolId: string;
  sppgId: string;
  note: string;
  attachmentUrl?: string | null;
  rating?: number | null;
  status: LaporanStatus;
}

export interface LaporanFilters {
  schoolId?: string;
  sppgId?: string;
}
