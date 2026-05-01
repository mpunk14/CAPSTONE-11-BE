import { laporanDb } from "../db/mockDb";
import { CreateLaporanDTO, Laporan } from "../types/laporan.type";

export const createLaporanService = (data: CreateLaporanDTO, filename: string): Laporan => {
  const newLaporan: Laporan = {
    id: Date.now(), // Pakai timestamp sebagai pengganti Auto Increment / UUID sementara
    catatan: data.catatan,
    status: data.status,
    sppg_id: data.sppg_id,
    sekolah_id: data.sekolah_id,
    foto_url: `http://localhost:${process.env.PORT || 3000}/uploads/${filename}`,
    created_at: new Date().toISOString(),
  };

  laporanDb.push(newLaporan);

  // Simulasi notifikasi ke SPPG Dashboard
  console.log(`\n🔔 [NOTIFIKASI DASHBOARD SPPG]`);
  console.log(`   Ada laporan baru masuk untuk SPPG ID: ${data.sppg_id} dari Sekolah ID: ${data.sekolah_id}`);
  console.log(`   Status: ${data.status}\n`);

  return newLaporan;
};

export const getSemuaLaporanService = (sppg_id?: number, sekolah_id?: number): Laporan[] => {
  let result = laporanDb;

  // Filter berdasarkan query param
  if (sppg_id) {
    result = result.filter(lap => lap.sppg_id === sppg_id);
  }
  
  if (sekolah_id) {
    result = result.filter(lap => lap.sekolah_id === sekolah_id);
  }

  return result;
};

export const getLaporanByIdService = (id: number): Laporan | undefined => {
  return laporanDb.find(lap => lap.id === id);
};