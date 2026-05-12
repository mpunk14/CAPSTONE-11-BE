import { Router } from 'express';
import { getAllSekolah, getSekolahById } from '../controllers/schoolControllers';

const router = Router();

router.get('/', getAllSekolah);
router.get('/:id', getSekolahById);

export default router;
