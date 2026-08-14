/**
 * cv.service.ts — CV Analysis Business Logic
 *
 * Handles:
 * 1. Triggering CV analysis after a photo is uploaded (async, fire-and-forget)
 * 2. Cross-checking CV-detected foods vs. SPPG-reported menu
 * 3. Calculating match score and auto-flagging discrepancies
 * 4. Persisting results to cv_analysis_results table
 * 5. Fetching CV analysis result for a given documentation ID
 *
 * Rule 3 (AGENTS.md): No req/res here. Returns { status, data }.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { cvAnalysisResults, mealDocumentation, menus } from '../db/skema';
import { analyzeFood, type CVAnalysisResult } from './cvGateway';

// Threshold: if matchScore < FLAG_THRESHOLD, auto-flag the documentation
const FLAG_THRESHOLD = 60; // percent

// ──────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────

/**
 * Normalizes an Indonesian food name for fuzzy matching.
 * Lowercases, strips diacritics and common filler words.
 */
const normalizeFood = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/\b(goreng|rebus|kukus|bakar|tumis|saus|bumbu)\b/g, '') // strip cooking methods
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Extracts known food tokens from the SPPG-reported menu fields.
 * Returns a flat list of normalized strings.
 */
const extractMenuFoodTokens = (menu: {
  rice: string | null;
  sideDish: string | null;
  fruit: string | null;
}): string[] => {
  return [menu.rice, menu.sideDish, menu.fruit]
    .filter((v): v is string => Boolean(v))
    .flatMap((item) => item.split(/[,+&\/]/)) // split compound entries
    .map(normalizeFood)
    .filter(Boolean);
};

/**
 * Calculates match score (0–100) between CV-detected foods and menu tokens.
 *
 * Algorithm:
 * - For each detected food with confidence >= 0.5, check if any menu token
 *   contains or is contained by the detected food name.
 * - matchScore = (matched / totalDetected) * 100, weighted by confidence.
 * - Returns 100 if no menu exists (can't cross-check).
 */
const calculateMatchScore = (
  detectedFoods: CVAnalysisResult['detectedFoods'],
  menuTokens: string[],
): number => {
  if (menuTokens.length === 0) return 100; // No menu to cross-check

  const highConfidenceFoods = detectedFoods.filter((f) => f.confidence >= 0.5);
  if (highConfidenceFoods.length === 0) return 50; // No confident detections

  let weightedMatches = 0;
  let totalWeight = 0;

  for (const food of highConfidenceFoods) {
    const normalizedDetected = normalizeFood(food.name);
    const isMatched = menuTokens.some(
      (token) => normalizedDetected.includes(token) || token.includes(normalizedDetected),
    );

    const weight = food.confidence;
    totalWeight += weight;
    if (isMatched) weightedMatches += weight;
  }

  if (totalWeight === 0) return 50;
  return Math.round((weightedMatches / totalWeight) * 100);
};

/**
 * Builds a human-readable flag reason from the cross-check result.
 */
const buildFlagReason = (
  detectedFoods: CVAnalysisResult['detectedFoods'],
  menuTokens: string[],
  matchScore: number,
): string => {
  const unmatched = detectedFoods
    .filter((f) => f.confidence >= 0.5)
    .map((f) => f.name)
    .filter((name) => {
      const normalized = normalizeFood(name);
      return !menuTokens.some(
        (token) => normalized.includes(token) || token.includes(normalized),
      );
    });

  const missing = menuTokens.filter((token) => {
    return !detectedFoods.some((f) => {
      const normalized = normalizeFood(f.name);
      return normalized.includes(token) || token.includes(normalized);
    });
  });

  const parts: string[] = [];
  if (unmatched.length > 0) {
    parts.push(`Makanan terdeteksi tidak ada di menu: ${unmatched.join(', ')}`);
  }
  if (missing.length > 0) {
    parts.push(`Makanan di menu tidak terdeteksi: ${missing.join(', ')}`);
  }
  if (parts.length === 0) {
    parts.push(`Skor kecocokan rendah (${matchScore}%) — perlu tinjauan manual`);
  }

  return parts.join('. ');
};

// ──────────────────────────────────────────────
// Public service functions
// ──────────────────────────────────────────────

/**
 * Runs CV analysis for a meal documentation record asynchronously.
 * This function should be called fire-and-forget from the upload controller.
 * It will never throw — all errors are caught and stored as 'failed' status.
 */
export const triggerCvAnalysis = async (
  documentationId: string,
  photoUrl: string,
  sppgId: string,
  productionDate: string,
): Promise<void> => {
  // Create a 'pending' record first
  const [analysisRecord] = await db
    .insert(cvAnalysisResults)
    .values({
      documentationId,
      status: 'pending',
    })
    .returning()
    .catch(() => [null]);

  if (!analysisRecord) return;

  try {
    // Update status to 'processing'
    await db
      .update(cvAnalysisResults)
      .set({ status: 'processing' })
      .where(eq(cvAnalysisResults.id, analysisRecord.id));

    const startTime = Date.now();
    const cvResult = await analyzeFood(photoUrl);

    if (!cvResult) {
      // ML service unavailable — mark as failed, graceful degradation
      await db
        .update(cvAnalysisResults)
        .set({ status: 'failed', errorMessage: 'ML service tidak tersedia atau timeout' })
        .where(eq(cvAnalysisResults.id, analysisRecord.id));

      await db
        .update(mealDocumentation)
        .set({ analysisStatus: 'failed' })
        .where(eq(mealDocumentation.id, documentationId));

      return;
    }

    const processingTimeMs = Date.now() - startTime;

    // Fetch the corresponding menu for cross-check
    const menuRows = await db
      .select()
      .from(menus)
      .where(and(eq(menus.sppgId, sppgId), eq(menus.menuDate, productionDate)));

    const menu = menuRows[0] ?? null;
    const menuTokens = menu ? extractMenuFoodTokens(menu) : [];
    const matchScore = calculateMatchScore(cvResult.detectedFoods, menuTokens);
    const isFlagged = matchScore < FLAG_THRESHOLD;
    const flagReason = isFlagged
      ? buildFlagReason(cvResult.detectedFoods, menuTokens, matchScore)
      : null;

    await db
      .update(cvAnalysisResults)
      .set({
        status: 'completed',
        detectedFoods: JSON.stringify(cvResult.detectedFoods),
        estimatedCalories: String(cvResult.estimatedNutrition.calories),
        estimatedProtein: String(cvResult.estimatedNutrition.protein),
        estimatedFat: String(cvResult.estimatedNutrition.fat),
        estimatedCarbs: String(cvResult.estimatedNutrition.carbohydrate),
        matchScore: String(matchScore),
        isFlagged,
        flagReason,
        processingTimeMs,
        analyzedAt: new Date(),
      })
      .where(eq(cvAnalysisResults.id, analysisRecord.id));

    // Update documentation status
    await db
      .update(mealDocumentation)
      .set({ analysisStatus: 'completed' })
      .where(eq(mealDocumentation.id, documentationId));
  } catch (error: any) {
    console.error('[cv.service] CV analysis failed for doc', documentationId, error?.message);

    await db
      .update(cvAnalysisResults)
      .set({
        status: 'failed',
        errorMessage: error?.message ?? 'Unknown error during CV analysis',
      })
      .where(eq(cvAnalysisResults.id, analysisRecord.id))
      .catch(() => {}); // Swallow — we're already in error handling

    await db
      .update(mealDocumentation)
      .set({ analysisStatus: 'failed' })
      .where(eq(mealDocumentation.id, documentationId))
      .catch(() => {});
  }
};

/**
 * Fetches the CV analysis result for a given documentation ID.
 * Returns { status, data } — used by the analysis fetch endpoint.
 */
export const getCvAnalysisService = async (documentationId: string) => {
  const [doc] = await db
    .select()
    .from(mealDocumentation)
    .where(eq(mealDocumentation.id, documentationId));

  if (!doc) {
    return {
      status: 404,
      data: { success: false, message: 'Dokumentasi tidak ditemukan' },
    };
  }

  const [analysis] = await db
    .select()
    .from(cvAnalysisResults)
    .where(eq(cvAnalysisResults.documentationId, documentationId));

  if (!analysis) {
    return {
      status: 200,
      data: {
        success: true,
        data: {
          documentationId,
          analysisStatus: doc.analysisStatus,
          analysis: null,
          message: 'Analisis CV belum dimulai atau sedang antri',
        },
      },
    };
  }

  const detectedFoods = (() => {
    try {
      return analysis.detectedFoods ? JSON.parse(analysis.detectedFoods) : [];
    } catch {
      return [];
    }
  })();

  return {
    status: 200,
    data: {
      success: true,
      data: {
        documentationId,
        photoUrl: doc.photoUrl,
        analysisStatus: analysis.status,
        detectedFoods,
        estimatedNutrition: {
          calories: analysis.estimatedCalories ? Number(analysis.estimatedCalories) : null,
          protein: analysis.estimatedProtein ? Number(analysis.estimatedProtein) : null,
          fat: analysis.estimatedFat ? Number(analysis.estimatedFat) : null,
          carbohydrate: analysis.estimatedCarbs ? Number(analysis.estimatedCarbs) : null,
        },
        matchScore: analysis.matchScore ? Number(analysis.matchScore) : null,
        isFlagged: analysis.isFlagged,
        flagReason: analysis.flagReason,
        processingTimeMs: analysis.processingTimeMs,
        analyzedAt: analysis.analyzedAt,
      },
    },
  };
};
