const API_BASE = '/api/fertilizer-calculator';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type AreaUnit = 'bigha' | 'acre' | 'hectare' | 'guntha' | 'katha';
export type CalcMethod = 'soil' | 'crop';

export interface CropMeta { key: string; label: string; labelHi: string }
export interface AreaUnitMeta { value: AreaUnit; label: string; labelHi: string }

export interface OrganicOption {
  name: string; nameHi: string; quantity: string;
  applicationMethod: string; applicationTiming: string;
  benefit: string; benefitHi: string; priority: number;
}
export interface ChemicalFertilizer {
  name: string; nameHi: string; npkRatio: string;
  quantityKg: number; quantityPerUnit: string;
  nutrientProvided: string; applicationMethod: string;
  applicationTiming: string; costEstimate: string;
}
export interface NutrientStatus {
  required: number; available: number | null; deficit: number;
  state: 'adequate' | 'low' | 'deficient' | 'data_unavailable';
  message: string;
}
export interface FertilizerResult {
  crop: string; cropHi: string;
  areaHectares: number; areaDisplay: string;
  method: CalcMethod;
  requiredN: number; requiredP: number; requiredK: number;
  deficitN: number; deficitP: number; deficitK: number;
  nutrientStatus: {
    nitrogen: NutrientStatus;
    phosphorus: NutrientStatus;
    potassium: NutrientStatus;
  };
  organicFirst: OrganicOption[];
  chemicalFertilizers: ChemicalFertilizer[];
  applicationSchedule: { stage: string; stageHi: string; products: string }[];
  totalCostMin: number; totalCostMax: number;
  soilUsed: boolean; tips: string[]; tipsHi: string[];
  warnings: string[]; dataLimitations: string[];
}
export interface FertilizerAIResponse {
  summary: string; summaryHi: string;
  soilReason: string; soilReasonHi: string;
  organicRecommendation: {
    name: string; nameHi: string; quantity: string;
    method: string; methodHi: string; timing: string; timingHi: string;
    preparation: string; preparationHi: string;
  };
  chemicalRecommendation: {
    name: string; nameHi: string; composition: string; quantity: string;
    method: string; methodHi: string; timing: string; timingHi: string;
    precautions: string; precautionsHi: string;
  };
  applicationMethod: string; applicationMethodHi: string;
  timing: string; timingHi: string;
  warnings: string[]; warningsHi: string[];
  aiGenerated: boolean; cached: boolean;
}

export interface SoilReportSummary {
  _id: string; soilType?: string; soilHealthScore?: number;
  soilHealthStatus?: string; createdAt: string;
  nitrogen?: number; phosphorus?: number; potassium?: number;
}

export async function fetchMeta(): Promise<{ crops: CropMeta[]; areaUnits: AreaUnitMeta[] }> {
  const res = await fetch(`${API_BASE}/meta`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to load meta');
  return json;
}

export async function fetchSoilReports(): Promise<SoilReportSummary[]> {
  const res = await fetch(`${API_BASE}/soil-reports`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to load soil reports');
  return json.data;
}

export async function calculateFertilizer(payload: {
  crop: string; areaValue: number; areaUnit: AreaUnit; method: CalcMethod; soilReportId?: string;
}): Promise<{ calculation: FertilizerResult; ai: FertilizerAIResponse | null }> {
  const res = await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Calculation failed');
  return { calculation: json.data, ai: json.ai || null };
}
