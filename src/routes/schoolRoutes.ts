import { Router } from 'express';
import {
  createSekolahCatatan,
  createSekolahDokumentasi,
  getAllSekolah,
  getSekolahById,
  getSekolahCatatan,
  getSekolahDokumentasi,
  getSekolahMenuHarian,
  getSekolahNutrisi,
  getSekolahSppg,
} from '../controllers/schoolControllers';

const router = Router();

router.get('/', getAllSekolah);
router.get('/:id/sppg', getSekolahSppg);
router.get('/:id/menu-harian', getSekolahMenuHarian);
router.get('/:id/dokumentasi', getSekolahDokumentasi);
router.get('/:id/nutrisi', getSekolahNutrisi);
router.get('/:id/catatan', getSekolahCatatan);
router.post('/:id/dokumentasi', createSekolahDokumentasi);
router.post('/:id/catatan', createSekolahCatatan);
router.get('/:id', getSekolahById);

export default router;
