import { Router } from 'express';
import { kirimLaporan, getRiwayatLaporan } from '../controllers/schoolControllers';

const router = Router();
router.post('/laporan', kirimLaporan);
router.get('/laporan', getRiwayatLaporan);
export default router;