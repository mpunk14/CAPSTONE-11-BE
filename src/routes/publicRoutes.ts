import { Router } from 'express';
import { getAllArtikel, getArtikelById, getMenu } from '../controllers/publicControllers';

const router = Router();

router.get('/menu', getMenu);
router.get('/menu/:sppgId', getMenu);
router.get('/artikel', getAllArtikel);
router.get('/artikel/:id', getArtikelById);

export default router;
