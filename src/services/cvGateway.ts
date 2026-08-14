/**
 * cvGateway.ts — ML Service HTTP Client
 *
 * Single integration point for all communication with the Python/FastAPI ML service.
 * Implements graceful degradation: returns null on timeout/error instead of throwing.
 * Rule 10 (AGENTS.md): ALL CV calls must go through this module.
 */

export interface DetectedFood {
  name: string;
  confidence: number; // 0–1
  portionGrams: number;
}

export interface CVAnalysisResult {
  detectedFoods: DetectedFood[];
  estimatedNutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrate: number;
  };
  processingTimeMs: number;
}

const ML_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Analyze a meal photo by sending its URL to the ML service.
 * Returns null if the ML service is unavailable, misconfigured, or times out.
 */
export const analyzeFood = async (imageUrl: string): Promise<CVAnalysisResult | null> => {
  const ML_URL = process.env.ML_SERVICE_URL;

  if (!ML_URL) {
    console.warn('[cvGateway] ML_SERVICE_URL not configured — skipping CV analysis');
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

  try {
    const res = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[cvGateway] ML service responded with HTTP ${res.status}`);
      return null;
    }

    return (await res.json()) as CVAnalysisResult;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error?.name === 'AbortError') {
      console.error('[cvGateway] ML service request timed out after 10s');
    } else {
      console.error('[cvGateway] ML service request failed:', error?.message ?? error);
    }
    return null; // Graceful degradation — never throw to the user
  }
};

/**
 * Check whether the ML service is reachable.
 * Used by health-check endpoints.
 */
export const pingMlService = async (): Promise<boolean> => {
  const ML_URL = process.env.ML_SERVICE_URL;
  if (!ML_URL) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);

  try {
    const res = await fetch(`${ML_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    clearTimeout(timeout);
    return false;
  }
};
