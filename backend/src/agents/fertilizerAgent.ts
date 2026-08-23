/**
 * Fertilizer Agent — Pragati AI Integration
 *
 * Routes fertilizer-related questions through the shared Fertilizer Calculation Engine
 * and Fertilizer AI service. Uses the SAME calculation logic as the Fertilizer Calculator.
 *
 * Data sources:
 *   - ctx.entities.crop (pre-extracted)
 *   - ctx.shared.soilReport (pre-loaded, optional)
 *   - ctx.farmerProfile (farm area, location)
 *
 * Flow:
 *   Extract crop + area → calculateFertilizer() → getFertilizerAIRecommendation() → structured result
 *
 * If crop is missing → asks farmer for crop
 * If area missing → uses farmerProfile.farmSize or asks
 * Soil report is always optional — crop-based calculation works without it
 */

import { SoilReport } from '../models/SoilReport';
import { AgentContext, AgentResult } from './types';
import { buildFallbackResult, buildErrorResult } from '../services/fallbackManager';
import { createLogger } from '../utils/logger';
import { calculateFertilizer, type CalculationMethod } from '../services/fertilizerCalculatorService';
import { getFertilizerAIRecommendation } from '../services/fertilizerAI';

const log = createLogger('fertilizerAgent');

const NITROGEN_LOW_THRESHOLD = 200;
const PHOSPHORUS_LOW_THRESHOLD = 10;
const POTASSIUM_LOW_THRESHOLD = 150;

function extractAreaValue(profile: AgentContext['farmerProfile']): { value: number; unit: 'bigha' | 'acre' | 'hectare' } | null {
  if (!profile?.farmSize) return null;

  const match = String(profile.farmSize).match(/([\d.]+)\s*(bigha|acre|hectare|ha|bigha)?/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  if (isNaN(value) || value <= 0) return null;

  const unitRaw = (match[2] || 'bigha').toLowerCase();
  const unit = unitRaw.startsWith('hec') || unitRaw === 'ha' ? 'hectare'
    : unitRaw === 'acre' ? 'acre'
    : 'bigha';

  return { value, unit };
}

export async function runFertilizerAgent(ctx: AgentContext): Promise<AgentResult> {
  try {
    const { userId, entities, shared, farmerProfile } = ctx;

    const cropName = entities?.crop || '';

    if (!cropName) {
      return {
        agent: 'FertilizerAgent',
        success: false,
        data: { missingInfo: ['crop'] },
        summary: 'कृपया अपनी फसल बताएं (जैसे: गेहूं, धान, मक्का, कपास) — ताकि मैं सही खाद की सलाह दे सकूं।',
      };
    }

    // Get soil report from shared context
    let soilReport: any = shared?.soilReport || null;
    if (!soilReport) {
      log.debug('FertilizerAgent: shared context missing, querying DB directly', { userId });
      soilReport = await SoilReport.findOne({ farmerId: userId })
        .sort({ createdAt: -1 })
        .lean();
    }

    // Determine calculation method
    const hasSoilData = soilReport &&
      (soilReport.nitrogen !== undefined || soilReport.phosphorus !== undefined || soilReport.potassium !== undefined);
    const method: CalculationMethod = hasSoilData ? 'soil' : 'crop';

    // Extract area
    const areaInfo = extractAreaValue(farmerProfile);
    const areaValue = areaInfo?.value ?? 1;
    const areaUnit = areaInfo?.unit ?? 'bigha';

    // Build soil input for calculation engine
    const soilInput = hasSoilData ? {
      nitrogen: soilReport.nitrogen,
      phosphorus: soilReport.phosphorus,
      potassium: soilReport.potassium,
      organicCarbon: soilReport.organicCarbon,
      pH: soilReport.pH,
    } : undefined;

    // Run deterministic calculation (shared engine)
    const calculation = calculateFertilizer({
      crop: cropName,
      areaValue,
      areaUnit,
      method,
      soil: soilInput,
    });

    // Get AI explanation
    const aiRecommendation = await getFertilizerAIRecommendation({
      calculation,
      soilType: soilReport?.soilType,
      soilPH: soilReport?.pH,
      organicCarbon: soilReport?.organicCarbon,
    });

    // Build nutrient summary
    const nStatus = calculation.nutrientStatus;
    const nutrientSummary = [
      `N: ${nStatus.nitrogen.state}${nStatus.nitrogen.available !== null ? ` (${nStatus.nitrogen.available} kg/ha available)` : ''}`,
      `P: ${nStatus.phosphorus.state}${nStatus.phosphorus.available !== null ? ` (${nStatus.phosphorus.available} kg/ha available)` : ''}`,
      `K: ${nStatus.potassium.state}${nStatus.potassium.available !== null ? ` (${nStatus.potassium.available} kg/ha available)` : ''}`,
    ].join(', ');

    const chemSummary = calculation.chemicalFertilizers.length > 0
      ? calculation.chemicalFertilizers.map(f => `${f.name} ${f.quantityKg}kg`).join(', ')
      : 'कोई रासायनिक खाद की आवश्यकता नहीं (मिट्टी में पोषक तत्व पर्याप्त)';

    const summary = soilReport
      ? `${calculation.crop} (${calculation.areaDisplay}): ${nutrientSummary}. ${aiRecommendation.summary} रासायनिक: ${chemSummary}`
      : `${calculation.crop} (${calculation.areaDisplay}): कोई मिट्टी रिपोर्ट नहीं — फसल-आधारित गणना। ${aiRecommendation.summary}`;

    return {
      agent: 'FertilizerAgent',
      success: true,
      data: {
        calculation,
        aiRecommendation,
        soilUsed: !!soilReport,
        cropName,
        nutrientSummary,
      },
      summary,
    };
  } catch (err: any) {
    log.error('FertilizerAgent error', { error: err?.message });
    return buildErrorResult('FertilizerAgent', 'fertilizer', err);
  }
}
