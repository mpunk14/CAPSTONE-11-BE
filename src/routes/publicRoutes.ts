import { Router } from 'express';
import {
  getAllArtikel,
  getArtikelById,
  getMenu,
  getAllSekolah,
  getSekolahById,
  getDashboard,
  getPetaSppg,
  getSppgDokumentasi,
  getAllSppg,
  getSppgById,
} from '../controllers/publicControllers';

const router = Router();

// Menu
router.get('/menu', getMenu);
router.get('/menu/:sppgId', getMenu);

// Artikel
router.get('/artikel', getAllArtikel);
router.get('/artikel/:id', getArtikelById);

// Sekolah
router.get('/sekolah', getAllSekolah);
router.get('/sekolah/:id', getSekolahById);

// SPPG (public)
router.get('/sppg', getAllSppg);
router.get('/sppg/:id', getSppgById);
router.get('/sppg/:id/dokumentasi', getSppgDokumentasi);

// Public transparency dashboard — FR-08
router.get('/public/dashboard', getDashboard);

// Interactive SPPG map with verification status — FR-11
router.get('/public/peta', getPetaSppg);

export default router;
