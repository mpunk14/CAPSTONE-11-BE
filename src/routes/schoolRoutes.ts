import { Router } from 'express';
import { getAllSekolah, getSchoolDashboardSummary, getSekolahById } from '../controllers/schoolControllers';
import { createLaporan, getLaporan, getLaporanById } from '../controllers/laporanController';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';

const router = Router();

router.get('/', getAllSekolah);
router.get('/dashboard/summary', verifyToken, requireRole('school', 'sekolah'), getSchoolDashboardSummary);
router.post('/reports', verifyToken, requireRole('school', 'sekolah'), createLaporan);
router.get('/reports', getLaporan);
router.get('/reports/history', getLaporan);
router.get('/reports/:id', getLaporanById);
router.get('/:id', getSekolahById);

export default router;
