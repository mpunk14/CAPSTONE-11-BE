import { Router } from 'express';
import { getAllArtikel, getArtikelById, getMenu, getAllSekolah, getSekolahById } from '../controllers/publicControllers';

const router = Router();

router.get('/menu', getMenu);
router.get('/menu/:sppgId', getMenu);
router.get('/artikel', getAllArtikel);
router.get('/artikel/:id', getArtikelById);
router.get('/sekolah', getAllSekolah);
router.get('/sekolah/:id', getSekolahById);

export default router;
