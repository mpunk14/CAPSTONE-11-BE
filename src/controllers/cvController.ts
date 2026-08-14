/**
 * cvController.ts — CV Analysis HTTP Layer
 *
 * Exposes endpoints for:
 * - GET /api/dokumentasi/:id/analysis  — fetch CV result for a documentation record
 *
 * Rule 2 (AGENTS.md): Controller is thin — reads req, calls service, writes res.
 */

import { Request, Response } from 'express';
import { isUuid } from '../utils/uuid';
import { getCvAnalysisService } from '../services/cv.service';

/**
 * GET /api/dokumentasi/:id/analysis
 * Public — so the frontend/school dashboard can poll for CV result without auth.
 * Protected sensitive data is not exposed (no user PII).
 */
export const getCvAnalysis = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Format ID dokumentasi tidak valid',
    });
  }

  try {
    const { status, data } = await getCvAnalysisService(id);
    return res.status(status).json(data);
  } catch (error) {
    throw error; // Let errorMiddleware handle unknown errors (Rule 5)
  }
};
