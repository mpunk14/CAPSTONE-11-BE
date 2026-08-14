/**
 * dokumentasiRoutes.ts — Meal Documentation & CV Analysis Routes
 */

import { Router } from 'express';
import { getCvAnalysis } from '../controllers/cvController';

const router = Router();

// GET /api/dokumentasi/:id/analysis
// Fetch CV analysis result for a given meal documentation ID.
// Public endpoint — frontend polls this after upload to show CV result.
router.get('/:id/analysis', getCvAnalysis);

export default router;
