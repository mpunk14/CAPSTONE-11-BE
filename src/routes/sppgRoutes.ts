import { Router } from 'express';
import { getNotifikasi, getNotifikasiById, getRiwayatMenu } from '../controllers/sppgControllers';

const router = Router();
router.get('/notifikasi', getNotifikasi);
router.get('/notifikasi/:id', getNotifikasiById);
router.get('/menu/riwayat', getRiwayatMenu);
export default router;