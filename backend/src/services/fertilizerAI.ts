// =============================================================================
// Fertilizer AI Recommendation Service
// Provides AI-enhanced explanations for deterministic fertilizer calculations.
// Provider-agnostic: configurable via FERTILIZER_AI_PROVIDER env var.
// Falls back gracefully when AI is unavailable.
// =============================================================================

import { FertilizerCalcResult } from './fertilizerCalculatorService';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FertilizerAIInput {
  calculation: FertilizerCalcResult;
  soilType?: string;
  soilPH?: number;
  organicCarbon?: number;
  ec?: number;
}

export interface FertilizerAIResponse {
  summary: string;
  summaryHi: string;
  soilReason: string;
  soilReasonHi: string;
  organicRecommendation: {
    name: string;
    nameHi: string;
    quantity: string;
    method: string;
    methodHi: string;
    timing: string;
    timingHi: string;
    preparation: string;
    preparationHi: string;
  };
  chemicalRecommendation: {
    name: string;
    nameHi: string;
    composition: string;
    quantity: string;
    method: string;
    methodHi: string;
    timing: string;
    timingHi: string;
    precautions: string;
    precautionsHi: string;
  };
  applicationMethod: string;
  applicationMethodHi: string;
  timing: string;
  timingHi: string;
  warnings: string[];
  warningsHi: string[];
  aiGenerated: boolean;
  cached: boolean;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const aiCache = new Map<string, { response: FertilizerAIResponse; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

function generateFingerprint(input: FertilizerAIInput): string {
  const c = input.calculation;
  return [
    c.crop,
    c.areaDisplay,
    c.method,
    c.soilUsed,
    c.deficitN,
    c.deficitP,
    c.deficitK,
    input.soilType || '',
    input.soilPH || '',
  ].join('|');
}

function getCached(fingerprint: string): FertilizerAIResponse | null {
  const entry = aiCache.get(fingerprint);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    aiCache.delete(fingerprint);
    return null;
  }
  return { ...entry.response, cached: true };
}

function setCached(fingerprint: string, response: FertilizerAIResponse): void {
  aiCache.set(fingerprint, { response, timestamp: Date.now() });
}

// ─── Config ─────────────────────────────────────────────────────────────────

interface AIProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: string;
}

function getProviderConfig(): AIProviderConfig | null {
  const apiKey = process.env.FERTILIZER_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const provider = (process.env.FERTILIZER_AI_PROVIDER || 'openrouter').toLowerCase();

  const configs: Record<string, { baseUrl: string; model: string }> = {
    openrouter: {
      baseUrl: process.env.FERTILIZER_AI_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.FERTILIZER_AI_MODEL || 'openai/gpt-4o-mini',
    },
    openai: {
      baseUrl: process.env.FERTILIZER_AI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.FERTILIZER_AI_MODEL || 'gpt-4o-mini',
    },
    nvidia: {
      baseUrl: process.env.FERTILIZER_AI_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      model: process.env.FERTILIZER_AI_MODEL || 'meta/llama-3.1-8b-instruct',
    },
  };

  const config = configs[provider] || configs.openrouter;
  return { ...config, apiKey, provider };
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

function buildAIPrompt(input: FertilizerAIInput): string {
  const c = input.calculation;
  const nStatus = c.nutrientStatus;

  const lines: string[] = [
    'You are an expert agricultural scientist helping Indian farmers with fertilizer recommendations.',
    '',
    'A deterministic fertilizer calculation engine has produced the following results based on soil testing and crop requirements.',
    'Your task is to explain these results in simple, farmer-friendly language. Do NOT invent or change any quantities.',
    '',
    '## Calculation Results (AUTHORITATIVE - DO NOT MODIFY)',
    `- Crop: ${c.crop}`,
    `- Farm Area: ${c.areaDisplay}`,
    `- Calculation Method: ${c.method === 'soil' ? 'Soil-Based (using soil report data)' : 'Crop-Based (standard requirements)'}`,
    `- Soil Report Used: ${c.soilUsed ? 'Yes' : 'No'}`,
    '',
    '## Nutrient Status',
    `- Nitrogen (N): Required ${nStatus.nitrogen.required} kg/ha, Available: ${nStatus.nitrogen.available !== null ? nStatus.nitrogen.available + ' kg/ha' : 'Data unavailable'}, Deficit: ${nStatus.nitrogen.deficit} kg/ha, State: ${nStatus.nitrogen.state}`,
    `- Phosphorus (P): Required ${nStatus.phosphorus.required} kg/ha, Available: ${nStatus.phosphorus.available !== null ? nStatus.phosphorus.available + ' kg/ha' : 'Data unavailable'}, Deficit: ${nStatus.phosphorus.deficit} kg/ha, State: ${nStatus.phosphorus.state}`,
    `- Potassium (K): Required ${nStatus.potassium.required} kg/ha, Available: ${nStatus.potassium.available !== null ? nStatus.potassium.available + ' kg/ha' : 'Data unavailable'}, Deficit: ${nStatus.potassium.deficit} kg/ha, State: ${nStatus.potassium.state}`,
  ];

  if (input.soilType) lines.push(`- Soil Type: ${input.soilType}`);
  if (input.soilPH) lines.push(`- Soil pH: ${input.soilPH}`);

  lines.push('', '## Organic Recommendations (from calculation engine)');
  c.organicFirst.slice(0, 3).forEach((o) => {
    lines.push(`- ${o.name}: ${o.quantity}`);
  });

  lines.push('', '## Chemical Recommendations (from calculation engine - AUTHORITATIVE QUANTITIES)');
  c.chemicalFertilizers.forEach((f) => {
    lines.push(`- ${f.name} (${f.npkRatio}): ${f.quantityKg} kg total (${f.quantityPerUnit})`);
  });

  lines.push('', '## Instructions');
  lines.push('Explain these recommendations in simple farmer-friendly language.');
  lines.push('Do NOT calculate or invent new quantities — use ONLY the quantities provided above.');
  lines.push('If only Nitrogen is deficient, do NOT recommend P/K-heavy fertilizers.');
  lines.push('If data is missing for a nutrient, acknowledge the limitation.');
  lines.push('Return valid JSON only with this exact structure:');

  const jsonStructure = `{
  "summary": "Brief explanation of why these fertilizers are recommended",
  "summaryHi": "हिंदी में स्पष्टीकरण",
  "soilReason": "Why this specific fertilizer is needed based on soil/crop data",
  "soilReasonHi": "हिंदी में कारण",
  "organicRecommendation": {
    "name": "Primary organic option name",
    "nameHi": "हिंदी नाम",
    "quantity": "Quantity from calculation (DO NOT CHANGE)",
    "method": "How to apply",
    "methodHi": "हिंदी में तरीका",
    "timing": "When to apply",
    "timingHi": "हिंदी में समय",
    "preparation": "Preparation steps if applicable",
    "preparationHi": "हिंदी में तैयारी"
  },
  "chemicalRecommendation": {
    "name": "Primary chemical fertilizer name",
    "nameHi": "हिंदी नाम",
    "composition": "NPK ratio",
    "quantity": "Total quantity from calculation (DO NOT CHANGE)",
    "method": "How to apply",
    "methodHi": "हिंदी में तरीका",
    "timing": "When to apply",
    "timingHi": "हिंदी में समय",
    "precautions": "Safety precautions",
    "precautionsHi": "हिंदी में सावधानियां"
  },
  "applicationMethod": "Overall application guidance",
  "applicationMethodHi": "हिंदी में सामान्य मार्गदर्शन",
  "timing": "Overall timing guidance",
  "timingHi": "हिंदी में समय मार्गदर्शन",
  "warnings": ["Important precaution 1", "Important precaution 2"],
  "warningsHi": ["हिंदी में सावधानी 1", "हिंदी में सावधानी 2"]
}`;

  lines.push(jsonStructure);
  lines.push('', 'CRITICAL RULES:');
  lines.push('- Quantities MUST match the calculation engine output exactly');
  lines.push('- Do NOT recommend additional nutrients beyond what the calculation specifies');
  lines.push('- If soil data is unavailable, acknowledge it limits precision');
  lines.push('- Never claim laboratory accuracy');

  return lines.join('\n');
}

// ─── Response Validator ──────────────────────────────────────────────────────

function validateAIResponse(raw: unknown): FertilizerAIResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.summary !== 'string' || !r.summary) return null;
  if (typeof r.summaryHi !== 'string') return null;
  if (typeof r.soilReason !== 'string') return null;
  if (typeof r.soilReasonHi !== 'string') return null;

  const organic = r.organicRecommendation as Record<string, unknown> | undefined;
  const chemical = r.chemicalRecommendation as Record<string, unknown> | undefined;

  if (!organic || typeof organic.name !== 'string') return null;
  if (!chemical || typeof chemical.name !== 'string') return null;

  const warnings = Array.isArray(r.warnings)
    ? r.warnings.filter((w): w is string => typeof w === 'string')
    : [];
  const warningsHi = Array.isArray(r.warningsHi)
    ? r.warningsHi.filter((w): w is string => typeof w === 'string')
    : [];

  return {
    summary: r.summary,
    summaryHi: r.summaryHi || r.summary,
    soilReason: r.soilReason || '',
    soilReasonHi: r.soilReasonHi || r.soilReason || '',
    organicRecommendation: {
      name: organic.name || '',
      nameHi: (organic.nameHi as string) || organic.name || '',
      quantity: (organic.quantity as string) || '',
      method: (organic.method as string) || '',
      methodHi: (organic.methodHi as string) || (organic.method as string) || '',
      timing: (organic.timing as string) || '',
      timingHi: (organic.timingHi as string) || (organic.timing as string) || '',
      preparation: (organic.preparation as string) || '',
      preparationHi: (organic.preparationHi as string) || (organic.preparation as string) || '',
    },
    chemicalRecommendation: {
      name: chemical.name || '',
      nameHi: (chemical.nameHi as string) || chemical.name || '',
      composition: (chemical.composition as string) || '',
      quantity: (chemical.quantity as string) || '',
      method: (chemical.method as string) || '',
      methodHi: (chemical.methodHi as string) || (chemical.method as string) || '',
      timing: (chemical.timing as string) || '',
      timingHi: (chemical.timingHi as string) || (chemical.timing as string) || '',
      precautions: (chemical.precautions as string) || '',
      precautionsHi: (chemical.precautionsHi as string) || (chemical.precautions as string) || '',
    },
    applicationMethod: (r.applicationMethod as string) || '',
    applicationMethodHi: (r.applicationMethodHi as string) || (r.applicationMethod as string) || '',
    timing: (r.timing as string) || '',
    timingHi: (r.timingHi as string) || (r.timing as string) || '',
    warnings,
    warningsHi,
    aiGenerated: true,
    cached: false,
  };
}

// ─── Deterministic Fallback ──────────────────────────────────────────────────

function buildFallbackResponse(input: FertilizerAIInput): FertilizerAIResponse {
  const c = input.calculation;
  const n = c.nutrientStatus;

  const deficientNutrients: string[] = [];
  if (n.nitrogen.state === 'deficient' || n.nitrogen.state === 'low') deficientNutrients.push('Nitrogen');
  if (n.phosphorus.state === 'deficient' || n.phosphorus.state === 'low') deficientNutrients.push('Phosphorus');
  if (n.potassium.state === 'deficient' || n.potassium.state === 'low') deficientNutrients.push('Potassium');

  const primaryOrganic = c.organicFirst[0];
  const primaryChemical = c.chemicalFertilizers[0];

  const summary = deficientNutrients.length > 0
    ? `${c.crop} crop on ${c.areaDisplay} needs ${deficientNutrients.join(', ')} supplementation based on ${c.method} calculation.`
    : `${c.crop} crop on ${c.areaDisplay} — nutrients appear adequate based on ${c.method} calculation.`;

  const summaryHi = deficientNutrients.length > 0
    ? `${c.areaDisplay} में ${c.crop} फसल को ${deficientNutrients.join(', ')} की आवश्यकता है (${c.method === 'soil' ? 'मिट्टी रिपोर्ट' : 'फसल आवश्यकता'} के आधार पर)।`
    : `${c.areaDisplay} में ${c.crop} फसल — पोषक तत्व पर्याप्त हैं (${c.method === 'soil' ? 'मिट्टी रिपोर्ट' : 'फसल आवश्यकता'} के आधार पर)।`;

  const dataLimitations: string[] = [];
  const dataLimitationsHi: string[] = [];
  if (n.nitrogen.available === null) {
    dataLimitations.push('Soil Nitrogen data unavailable');
    dataLimitationsHi.push('मिट्टी में नाइट्रोजन का डेटा उपलब्ध नहीं');
  }
  if (n.phosphorus.available === null) {
    dataLimitations.push('Soil Phosphorus data unavailable');
    dataLimitationsHi.push('मिट्टी में फॉस्फोरस का डेटा उपलब्ध नहीं');
  }
  if (n.potassium.available === null) {
    dataLimitations.push('Soil Potassium data unavailable');
    dataLimitationsHi.push('मिट्टी में पोटाश का डेटा उपलब्ध नहीं');
  }

  return {
    summary,
    summaryHi,
    soilReason: c.soilUsed
      ? `Based on soil report analysis, ${deficientNutrients.length > 0 ? deficientNutrients.join(', ') + ' supplementation recommended' : 'nutrients are adequate'}.`
      : `Using standard ${c.crop} nutrient requirements (no soil report selected).`,
    soilReasonHi: c.soilUsed
      ? `मिट्टी रिपोर्ट के आधार पर, ${deficientNutrients.length > 0 ? deficientNutrients.join(', ') + ' की आवश्यकता' : 'पोषक तत्व पर्याप्त'}।`
      : `मानक ${c.crop} पोषक आवश्यकता (कोई मिट्टी रिपोर्ट नहीं चुनी गई)।`,
    organicRecommendation: {
      name: primaryOrganic?.name || 'FYM',
      nameHi: primaryOrganic?.nameHi || 'गोबर की खाद',
      quantity: primaryOrganic?.quantity || 'As per calculation',
      method: primaryOrganic?.applicationMethod || 'Broadcast and mix into soil',
      methodHi: primaryOrganic?.applicationMethod || 'मिट्टी में मिलाएं',
      timing: primaryOrganic?.applicationTiming || 'At land preparation',
      timingHi: primaryOrganic?.applicationTiming || 'भूमि तैयारी के समय',
      preparation: '',
      preparationHi: '',
    },
    chemicalRecommendation: {
      name: primaryChemical?.name || 'None needed',
      nameHi: primaryChemical?.nameHi || 'आवश्यक नहीं',
      composition: primaryChemical?.npkRatio || '',
      quantity: primaryChemical ? `${primaryChemical.quantityKg} kg` : 'Not needed',
      method: primaryChemical?.applicationMethod || 'Broadcast and mix into soil',
      methodHi: primaryChemical?.applicationMethod || 'मिट्टी में मिलाएं',
      timing: primaryChemical?.applicationTiming || 'As per schedule',
      timingHi: primaryChemical?.applicationTiming || 'अनुसूची के अनुसार',
      precautions: 'Avoid over-application. Follow recommended quantities only.',
      precautionsHi: 'अधिक मात्रा न डालें। केवल सुझाई गई मात्रा ही उपयोग करें।',
    },
    applicationMethod: 'Apply organic fertilizers at land preparation. Split chemical fertilizer application as recommended.',
    applicationMethodHi: 'जैविक खाद भूमि तैयारी में डालें। रासायनिक खाद को विभाजित खुराक में दें।',
    timing: c.applicationSchedule[0]?.stage || 'At sowing',
    timingHi: c.applicationSchedule[0]?.stageHi || 'बुवाई के समय',
    warnings: [
      ...dataLimitations,
      'These are general recommendations. Adjust based on local conditions.',
    ],
    warningsHi: [
      ...dataLimitationsHi,
      'यह सामान्य सिफारिशें हैं। स्थानीय स्थिति के अनुसार समायोजित करें।',
    ],
    aiGenerated: false,
    cached: false,
  };
}

// ─── Main Service Function ───────────────────────────────────────────────────

export async function getFertilizerAIRecommendation(
  input: FertilizerAIInput
): Promise<FertilizerAIResponse> {
  const fingerprint = generateFingerprint(input);

  // Check cache first
  const cached = getCached(fingerprint);
  if (cached) return cached;

  const config = getProviderConfig();
  if (!config) {
    const fallback = buildFallbackResponse(input);
    setCached(fingerprint, fallback);
    return fallback;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'Kisan Pragati Fertilizer AI',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an agricultural expert AI for Indian farmers. Always respond in valid JSON only. Never invent quantities. Use only the provided calculation data.',
          },
          {
            role: 'user',
            content: buildAIPrompt(input),
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const fallback = buildFallbackResponse(input);
      setCached(fingerprint, fallback);
      return fallback;
    }

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const fallback = buildFallbackResponse(input);
      setCached(fingerprint, fallback);
      return fallback;
    }

    // Strip markdown fences and parse JSON
    const cleaned = content.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) {
      const fallback = buildFallbackResponse(input);
      setCached(fingerprint, fallback);
      return fallback;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      const fallback = buildFallbackResponse(input);
      setCached(fingerprint, fallback);
      return fallback;
    }

    const validated = validateAIResponse(parsed);
    if (!validated) {
      const fallback = buildFallbackResponse(input);
      setCached(fingerprint, fallback);
      return fallback;
    }

    setCached(fingerprint, validated);
    return validated;
  } catch {
    const fallback = buildFallbackResponse(input);
    setCached(fingerprint, fallback);
    return fallback;
  }
}

// ─── Pragati AI Integration Boundary ────────────────────────────────────────

export interface FertilizerRecommendationIntent {
  intent: 'fertilizer_recommendation';
  crop: string;
  areaValue: number;
  areaUnit: string;
  method: string;
  soilReportId?: string;
  soilType?: string;
}

export function isFertilizerRecommendationIntent(intent: string): boolean {
  return intent === 'fertilizer_recommendation';
}

export { buildFallbackResponse };
