import { Router } from 'express';
import { getAllSppg, getSppgById, getAllSekolah, getSekolahById, getMenu, getAllArtikel, getArtikelById } from '../controllers/publicControllers';

const router = Router();
router.get('/sppg', getAllSppg);
router.get('/sppg/:id', getSppgById);
router.get('/sekolah', getAllSekolah);
router.get('/sekolah/:id', getSekolahById);
router.get('/menu', getMenu);
router.get('/artikel', getAllArtikel);
router.get('/artikel/:id', getArtikelById);
export default router;