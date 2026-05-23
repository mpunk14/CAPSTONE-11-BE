import { Router } from 'express';
import {
  createSekolahCatatan,
  createSekolahDokumentasi,
  getAllSekolah,
  getSchoolDashboardSummary,
  getSekolahById,
  getSekolahCatatan,
  getSekolahDokumentasi,
  getSekolahMenuHarian,
  getSekolahNutrisi,
  getSekolahSppg,
} from '../controllers/schoolControllers';
import { getAllSekolah as getAllSekolahPublic } from '../controllers/publicControllers';
import { createLaporan, getLaporan, getLaporanById } from '../controllers/laporanController';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';

const router = Router();

router.get('/', getAllSekolahPublic);
router.get('/dashboard/summary', verifyToken, requireRole('school', 'sekolah'), getSchoolDashboardSummary);
router.post('/reports', verifyToken, requireRole('school', 'sekolah'), createLaporan);
router.get('/reports', getLaporan);
router.get('/reports/history', getLaporan);
router.get('/reports/:id', getLaporanById);
router.get('/:id/sppg', getSekolahSppg);
router.get('/:id/menu-harian', getSekolahMenuHarian);
router.get('/:id/dokumentasi', getSekolahDokumentasi);
router.post('/:id/dokumentasi', createSekolahDokumentasi);
router.get('/:id/nutrisi', getSekolahNutrisi);
router.get('/:id/catatan', getSekolahCatatan);
router.post('/:id/catatan', createSekolahCatatan);
router.get('/:id', getSekolahById);

export default router;
