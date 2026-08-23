// =============================================================================
// Fertilizer Calculation Engine
// Deterministic, crop-specific fertilizer recommendations based on:
//   - Soil-Based: crop demand − soil available nutrients
//   - Crop-Based: standard crop nutrient requirements
// =============================================================================

export type AreaUnit = 'bigha' | 'acre' | 'hectare' | 'guntha' | 'katha';
export type CalculationMethod = 'soil' | 'crop';

// Conversion to hectares
const TO_HECTARE: Record<AreaUnit, number> = {
  hectare: 1,
  acre: 0.404686,
  bigha: 0.2529,
  guntha: 0.010117,
  katha: 0.006772,
};

// Legume crops — fix atmospheric nitrogen, require less N fertilizer
const LEGUME_CROPS = new Set(['soybean', 'gram', 'groundnut', 'lentil', 'moong', 'urad', 'pea']);

// NPK requirement in kg/hectare for each crop (N, P2O5, K2O)
const CROP_NPK: Record<string, { N: number; P: number; K: number; label: string; labelHi: string }> = {
  wheat:      { N: 120, P: 60,  K: 40,  label: 'Wheat',      labelHi: 'गेहूं' },
  rice:       { N: 120, P: 60,  K: 60,  label: 'Rice',       labelHi: 'धान' },
  maize:      { N: 150, P: 75,  K: 50,  label: 'Maize',      labelHi: 'मक्का' },
  cotton:     { N: 150, P: 60,  K: 60,  label: 'Cotton',     labelHi: 'कपास' },
  sugarcane:  { N: 250, P: 100, K: 120, label: 'Sugarcane',  labelHi: 'गन्ना' },
  potato:     { N: 180, P: 100, K: 150, label: 'Potato',     labelHi: 'आलू' },
  tomato:     { N: 120, P: 80,  K: 100, label: 'Tomato',     labelHi: 'टमाटर' },
  onion:      { N: 100, P: 50,  K: 100, label: 'Onion',      labelHi: 'प्याज' },
  mustard:    { N: 80,  P: 40,  K: 40,  label: 'Mustard',    labelHi: 'सरसों' },
  soybean:    { N: 20,  P: 60,  K: 40,  label: 'Soybean',    labelHi: 'सोयाबीन' },
  gram:       { N: 20,  P: 50,  K: 30,  label: 'Gram',       labelHi: 'चना' },
  groundnut:  { N: 20,  P: 50,  K: 75,  label: 'Groundnut',  labelHi: 'मूंगफली' },
  sunflower:  { N: 90,  P: 60,  K: 60,  label: 'Sunflower',  labelHi: 'सूरजमुखी' },
  bajra:      { N: 80,  P: 40,  K: 40,  label: 'Bajra',      labelHi: 'बाजरा' },
  jowar:      { N: 80,  P: 40,  K: 40,  label: 'Jowar',      labelHi: 'ज्वार' },
  barley:     { N: 60,  P: 30,  K: 20,  label: 'Barley',     labelHi: 'जौ' },
  lentil:     { N: 18,  P: 40,  K: 20,  label: 'Lentil',     labelHi: 'मसूर' },
  moong:      { N: 18,  P: 40,  K: 20,  label: 'Moong',      labelHi: 'मूंग' },
  urad:       { N: 18,  P: 40,  K: 20,  label: 'Urad',       labelHi: 'उड़द' },
  garlic:     { N: 100, P: 50,  K: 80,  label: 'Garlic',     labelHi: 'लहसुन' },
  ginger:     { N: 75,  P: 50,  K: 75,  label: 'Ginger',     labelHi: 'अदरक' },
  turmeric:   { N: 60,  P: 50,  K: 120, label: 'Turmeric',   labelHi: 'हल्दी' },
  brinjal:    { N: 100, P: 50,  K: 50,  label: 'Brinjal',    labelHi: 'बैंगन' },
  cabbage:    { N: 120, P: 60,  K: 60,  label: 'Cabbage',    labelHi: 'पत्तागोभी' },
  cauliflower:{ N: 120, P: 60,  K: 60,  label: 'Cauliflower',labelHi: 'फूलगोभी' },
  pea:        { N: 20,  P: 60,  K: 50,  label: 'Pea',        labelHi: 'मटर' },
};

// Soil nutrient availability thresholds (kg/ha)
// Below = deficient, Above = adequate
const SOIL_THRESHOLDS = {
  nitrogen: { low: 200, optimal: 350 },
  phosphorus: { low: 15, optimal: 25 },
  potassium: { low: 150, optimal: 280 },
};

export interface SoilNutrients {
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organicCarbon?: number;
  pH?: number;
  ec?: number;
}

export interface FertilizerCalcInput {
  crop: string;
  areaValue: number;
  areaUnit: AreaUnit;
  method: CalculationMethod;
  soil?: SoilNutrients;
}

export interface NutrientStatus {
  required: number;
  available: number | null;
  deficit: number;
  state: 'adequate' | 'low' | 'deficient' | 'data_unavailable';
  message: string;
}

export interface OrganicOption {
  name: string;
  nameHi: string;
  quantity: string;
  applicationMethod: string;
  applicationTiming: string;
  benefit: string;
  benefitHi: string;
  priority: number;
}

export interface ChemicalFertilizer {
  name: string;
  nameHi: string;
  npkRatio: string;
  quantityKg: number;
  quantityPerUnit: string;
  nutrientProvided: string;
  applicationMethod: string;
  applicationTiming: string;
  costEstimate: string;
}

export interface FertilizerCalcResult {
  crop: string;
  cropHi: string;
  areaHectares: number;
  areaDisplay: string;
  method: CalculationMethod;
  soilUsed: boolean;
  requiredN: number;
  requiredP: number;
  requiredK: number;
  deficitN: number;
  deficitP: number;
  deficitK: number;
  nutrientStatus: {
    nitrogen: NutrientStatus;
    phosphorus: NutrientStatus;
    potassium: NutrientStatus;
  };
  organicFirst: OrganicOption[];
  chemicalFertilizers: ChemicalFertilizer[];
  applicationSchedule: { stage: string; stageHi: string; products: string }[];
  totalCostMin: number;
  totalCostMax: number;
  tips: string[];
  tipsHi: string[];
  warnings: string[];
  dataLimitations: string[];
}

function getNutrientStatus(
  required: number,
  available: number | undefined,
  nutrient: 'nitrogen' | 'phosphorus' | 'potassium'
): NutrientStatus {
  if (available === undefined || available === null) {
    return {
      required: Math.round(required),
      available: null,
      deficit: Math.round(required),
      state: 'data_unavailable',
      message: 'Data unavailable',
    };
  }
  const threshold = SOIL_THRESHOLDS[nutrient];
  const deficit = Math.max(0, required - available);
  let state: NutrientStatus['state'];
  if (available >= threshold.optimal) state = 'adequate';
  else if (available >= threshold.low) state = 'low';
  else state = 'deficient';

  return {
    required: Math.round(required),
    available: Math.round(available),
    deficit: Math.round(deficit),
    state,
    message: state === 'adequate' ? 'Adequate' : state === 'low' ? 'Low — supplement recommended' : 'Deficient — fertilizer needed',
  };
}

function buildOrganicOptions(
  defN: number, defP: number, defK: number,
  areaHa: number, cropKey: string
): OrganicOption[] {
  const options: OrganicOption[] = [];
  const isLegume = LEGUME_CROPS.has(cropKey);

  const fymTons = Math.round(areaHa * 10 * 10) / 10;
  options.push({
    name: 'Farm Yard Manure (FYM)',
    nameHi: 'गोबर की खाद (FYM)',
    quantity: `${fymTons} tonnes`,
    applicationMethod: 'Broadcast and mix into topsoil during land preparation',
    applicationTiming: '2–3 weeks before sowing',
    benefit: 'Improves soil structure, water retention, adds nutrients slowly',
    benefitHi: 'मिट्टी की संरचना सुधारे, जल धारण क्षमता बढ़ाए, पोषक तत्व धीरे-धीरे मिलें',
    priority: 1,
  });

  const vermiTons = Math.round(areaHa * 2.5 * 10) / 10;
  options.push({
    name: 'Vermicompost',
    nameHi: 'वर्मीकम्पोस्ट',
    quantity: `${vermiTons} tonnes`,
    applicationMethod: 'Mix with basal soil or apply near root zone',
    applicationTiming: 'At sowing or transplanting',
    benefit: 'Rich in micronutrients, improves water retention and soil biology',
    benefitHi: 'सूक्ष्म पोषक तत्वों से भरपूर, जल धारण क्षमता और मिट्टी जीवाणु बढ़ाए',
    priority: 2,
  });

  // Nitrogen-focused organic options (only for non-legumes with N deficit)
  if (!isLegume && defN > 30) {
    options.push({
      name: 'Neem Cake',
      nameHi: 'नीम की खली',
      quantity: `${Math.round(areaHa * 200)} kg`,
      applicationMethod: 'Mix into soil before sowing',
      applicationTiming: 'Basal (at land preparation)',
      benefit: 'Slow-release nitrogen + natural pest repellent',
      benefitHi: 'धीमी गति से नाइट्रोजन + प्राकृतिक कीट नाशक',
      priority: 3,
    });
    options.push({
      name: 'Green Manure (Dhaincha/Sunhemp)',
      nameHi: 'हरी खाद (ढैंचा/सनई)',
      quantity: `${Math.round(areaHa * 25)} kg seed`,
      applicationMethod: 'Sow green manure crop 30 days before main crop, plough back into soil',
      applicationTiming: '30 days before main crop sowing',
      benefit: 'Fixes atmospheric nitrogen, adds organic matter',
      benefitHi: 'वायुमंडलीय नाइट्रोजन स्थिर करे, जैविक पदार्थ बढ़ाए',
      priority: 4,
    });
  }

  // Phosphorus-focused organic options
  if (defP > 15) {
    options.push({
      name: 'Rock Phosphate',
      nameHi: 'रॉक फॉस्फेट',
      quantity: `${Math.round(areaHa * 200)} kg`,
      applicationMethod: 'Broadcast and mix into acidic soil',
      applicationTiming: 'Basal (at sowing)',
      benefit: 'Slow-release phosphorus, improves root growth',
      benefitHi: 'धीमी गति से फॉस्फोरस, जड़ विकास में सहायक',
      priority: 5,
    });
  }

  // Potassium-focused organic options
  if (defK > 15) {
    options.push({
      name: 'Wood Ash',
      nameHi: 'लकड़ी की राख',
      quantity: `${Math.round(areaHa * 400)} kg`,
      applicationMethod: 'Broadcast evenly, avoid direct contact with roots',
      applicationTiming: 'Basal (at sowing)',
      benefit: 'Natural potassium source, raises soil pH slightly',
      benefitHi: 'प्राकृतिक पोटाश स्रोत, मिट्टी का pH थोड़ा बढ़ाए',
      priority: 6,
    });
  }

  // Biofertilizers — legumes get Rhizobium, others get PSB/KSB
  const bioName = isLegume
    ? 'Biofertilizer (Rhizobium)'
    : 'Biofertilizer (PSB/KSB)';
  const bioNameHi = isLegume
    ? 'जैव उर्वरक (राइजोबियम)'
    : 'जैव उर्वरक (PSB/KSB)';
  const bioBenefit = isLegume
    ? 'Fixes atmospheric nitrogen in root nodules — reduces N fertilizer need by 25–50 kg/ha'
    : 'Solubilizes locked P & K in soil, boosts nutrient availability';
  const bioBenefitHi = isLegume
    ? 'जड़ गाँठों में वायुमंडलीय नाइट्रोजन स्थिर करे — N उर्वरक 25–50 kg/ha कम करे'
    : 'मिट्टी में बंद P-K घुलनशील करे, पोषक उपलब्धता बढ़ाए';

  options.push({
    name: bioName,
    nameHi: bioNameHi,
    quantity: `${Math.round(areaHa * 4)} packets (200g each)`,
    applicationMethod: 'Seed treatment: mix with jaggery solution, coat seeds, dry in shade',
    applicationTiming: 'At sowing (seed treatment)',
    benefit: bioBenefit,
    benefitHi: bioBenefitHi,
    priority: 7,
  });

  return options.sort((a, b) => a.priority - b.priority);
}

function buildChemicalFertilizers(
  defN: number, defP: number, defK: number,
  areaHa: number, isLegume: boolean
): ChemicalFertilizer[] {
  const result: ChemicalFertilizer[] = [];
  const warnings: string[] = [];

  // For legumes: reduce N fertilizer significantly
  const effectiveDefN = isLegume ? Math.min(defN, 25) : defN;
  const nReductionNote = isLegume && defN > 25
    ? ' (reduced — legume fixes N via Rhizobium)'
    : '';

  // Assume organic covers ~30% of remaining deficit
  const chemN = Math.max(0, effectiveDefN * 0.7);
  const chemP = Math.max(0, defP * 0.7);
  const chemK = Math.max(0, defK * 0.7);

  // Strategy: use DAP for P + some N, Urea for remaining N, MOP for K
  // Only recommend what's actually needed

  let ureaNProvided = 0;

  if (chemP > 5) {
    // DAP provides P + 18% N
    const dapKg = Math.round((chemP / 0.46) * areaHa);
    const nFromDap = Math.round(dapKg * 0.18 / areaHa * 10) / 10;
    result.push({
      name: 'DAP (Di-Ammonium Phosphate)',
      nameHi: 'डीएपी (डाई-अमोनियम फॉस्फेट)',
      npkRatio: '18:46:0',
      quantityKg: dapKg,
      quantityPerUnit: `${Math.round(dapKg / areaHa)} kg/ha`,
      nutrientProvided: `P₂O₅: ${Math.round(chemP * areaHa)} kg${nFromDap > 0 ? `, N: ${Math.round(nFromDap * areaHa)} kg` : ''}`,
      applicationMethod: 'Broadcast and mix into soil before sowing. Do not place directly on seeds.',
      applicationTiming: 'Basal (at sowing) / बुवाई के समय (बेसल)',
      costEstimate: `₹${Math.round(dapKg * 25)}–₹${Math.round(dapKg * 28)}`,
    });
    ureaNProvided = nFromDap;
  }

  // Remaining N to be covered by Urea (46% N)
  const remainingN = Math.max(0, chemN - ureaNProvided);
  if (remainingN > 5) {
    const ureaKg = Math.round((remainingN / 0.46) * areaHa);
    result.push({
      name: 'Urea',
      nameHi: 'यूरिया',
      npkRatio: '46:0:0',
      quantityKg: ureaKg,
      quantityPerUnit: `${Math.round(ureaKg / areaHa)} kg/ha`,
      nutrientProvided: `N: ${Math.round(remainingN * areaHa)} kg${nReductionNote}`,
      applicationMethod: 'Split application: broadcast at recommended stages. Avoid flooding conditions.',
      applicationTiming: 'Split: 50% basal + 50% top-dress / 50% बुवाई + 50% कल्ले निकलते समय',
      costEstimate: `₹${Math.round(ureaKg * 5.5)}–₹${Math.round(ureaKg * 6.5)}`,
    });
  } else if (chemN <= 5 && chemP <= 5 && defN > 0 && !isLegume) {
    // Edge case: soil has adequate N and P
    warnings.push('Soil N and P levels appear adequate — minimal chemical fertilizer needed.');
  }

  // K via MOP (60% K2O)
  if (chemK > 5) {
    const mopKg = Math.round((chemK / 0.60) * areaHa);
    result.push({
      name: 'MOP (Muriate of Potash)',
      nameHi: 'एमओपी (म्यूरेट ऑफ पोटाश)',
      npkRatio: '0:0:60',
      quantityKg: mopKg,
      quantityPerUnit: `${Math.round(mopKg / areaHa)} kg/ha`,
      nutrientProvided: `K₂O: ${Math.round(chemK * areaHa)} kg`,
      applicationMethod: 'Broadcast and mix into soil. Avoid chloride-sensitive crops in excess.',
      applicationTiming: 'Basal (at sowing) / बुवाई के समय (बेसल)',
      costEstimate: `₹${Math.round(mopKg * 16)}–₹${Math.round(mopKg * 19)}`,
    });
  }

  if (warnings.length > 0) {
    void warnings;
  }

  return result;
}

function buildSchedule(cropKey: string, method: CalculationMethod): { stage: string; stageHi: string; products: string }[] {
  const base = [
    { stage: 'Land Preparation', stageHi: 'भूमि तैयारी', products: 'FYM, Vermicompost, Rock Phosphate (if needed)' },
    { stage: 'Sowing / Transplanting', stageHi: 'बुवाई / रोपाई', products: 'DAP (if P deficient), Biofertilizer seed treatment' },
    { stage: 'Vegetative Stage (30–40 days)', stageHi: 'वानस्पतिक अवस्था (30–40 दिन)', products: 'Urea top-dress (50%), Neem Cake (if N deficient)' },
    { stage: 'Flowering / Fruiting', stageHi: 'फूल / फल अवस्था', products: 'Foliar spray: 2% DAP or 0.5% Boron if needed' },
  ];
  if (['sugarcane', 'potato', 'cotton'].includes(cropKey)) {
    base.push({ stage: 'Ratoon / Second Dose', stageHi: 'रैटून / दूसरी खुराक', products: 'Additional Urea + MOP split dose' });
  }
  if (method === 'crop') {
    base.push({ stage: 'Recommended: Soil Test', stageHi: 'सुझाव: मिट्टी जांच', products: 'For precise recommendations, get a soil test done' });
  }
  return base;
}

export function calculateFertilizer(input: FertilizerCalcInput): FertilizerCalcResult {
  const { crop, areaValue, areaUnit, method, soil } = input;
  const cropKey = crop.toLowerCase().trim();
  const cropData = CROP_NPK[cropKey] || CROP_NPK['wheat'];
  const isLegume = LEGUME_CROPS.has(cropKey);

  const areaHa = areaValue * TO_HECTARE[areaUnit];

  // Total crop requirement for the field
  let totalN: number, totalP: number, totalK: number;

  if (method === 'soil' && soil && (soil.nitrogen !== undefined || soil.phosphorus !== undefined || soil.potassium !== undefined)) {
    // SOIL-BASED: use actual crop NPK minus soil available
    totalN = cropData.N * areaHa;
    totalP = cropData.P * areaHa;
    totalK = cropData.K * areaHa;
  } else {
    // CROP-BASED: standard requirements
    totalN = cropData.N * areaHa;
    totalP = cropData.P * areaHa;
    totalK = cropData.K * areaHa;
  }

  // Soil available nutrients
  const soilN = soil?.nitrogen;
  const soilP = soil?.phosphorus;
  const soilK = soil?.potassium;

  // Deficit calculation
  const defN = method === 'soil' && soilN !== undefined ? Math.max(0, totalN - soilN * areaHa) : totalN;
  const defP = method === 'soil' && soilP !== undefined ? Math.max(0, totalP - soilP * areaHa) : totalP;
  const defK = method === 'soil' && soilK !== undefined ? Math.max(0, totalK - soilK * areaHa) : totalK;

  // Per-hectare values for fertilizer calculation
  const defNha = areaHa > 0 ? defN / areaHa : totalN / areaHa;
  const defPha = areaHa > 0 ? defP / areaHa : totalP / areaHa;
  const defKha = areaHa > 0 ? defK / areaHa : totalK / areaHa;

  // Nutrient status
  const nStatus = getNutrientStatus(totalN / areaHa, soilN, 'nitrogen');
  const pStatus = getNutrientStatus(totalP / areaHa, soilP, 'phosphorus');
  const kStatus = getNutrientStatus(totalK / areaHa, soilK, 'potassium');

  const organicFirst = buildOrganicOptions(defNha, defPha, defKha, areaHa, cropKey);
  const chemicalFertilizers = buildChemicalFertilizers(defNha, defPha, defKha, areaHa, isLegume);

  // Cost estimates
  const chemCostMin = chemicalFertilizers.reduce((s, f) => {
    const m = f.costEstimate.match(/₹(\d+)/);
    return s + (m ? parseInt(m[1]) : 0);
  }, 0);
  const chemCostMax = chemicalFertilizers.reduce((s, f) => {
    const m = f.costEstimate.match(/₹\d+–₹(\d+)/);
    return s + (m ? parseInt(m[1]) : 0);
  }, 0);
  const organicCostMin = Math.round(areaHa * 2500);
  const organicCostMax = Math.round(areaHa * 4500);

  // Warnings and limitations
  const warnings: string[] = [];
  const dataLimitations: string[] = [];

  if (method === 'soil') {
    if (soilN === undefined) dataLimitations.push('Soil Nitrogen data unavailable — full N requirement assumed');
    if (soilP === undefined) dataLimitations.push('Soil Phosphorus data unavailable — full P requirement assumed');
    if (soilK === undefined) dataLimitations.push('Soil Potassium data unavailable — full K requirement assumed');
    if (dataLimitations.length === 3) {
      warnings.push('No soil nutrient data available — calculation uses crop-based defaults');
    }
  }

  if (isLegume && defN > 30) {
    warnings.push(`${cropData.label} is a legume crop — nitrogen requirement reduced due to biological nitrogen fixation via Rhizobium`);
  }

  if (chemicalFertilizers.length === 0) {
    warnings.push('Based on available data, no chemical fertilizer is needed at this time.');
  }

  const tips = [
    'Always do soil testing every 2–3 seasons for precise recommendations.',
    'Apply organic manure 2–3 weeks before sowing for best nutrient release.',
    'Split urea application reduces nitrogen loss by 30–40%.',
    isLegume
      ? 'Use Rhizobium seed treatment — it can fix 25–50 kg N/ha from atmosphere.'
      : 'Biofertilizers can reduce chemical fertilizer need by 20–25%.',
    'Avoid over-application — excess fertilizer pollutes groundwater and damages soil.',
    method === 'crop'
      ? 'This is a general recommendation. For precise dosing, get a soil test done.'
      : 'Recommendation based on your soil report values.',
  ];
  const tipsHi = [
    'सटीक सिफारिश के लिए हर 2–3 सीज़न में मिट्टी जांच करवाएं।',
    'सर्वोत्तम पोषक उपलब्धता के लिए बुवाई से 2–3 सप्ताह पहले जैविक खाद डालें।',
    'यूरिया को विभाजित मात्रा में देने से नाइट्रोजन की हानि 30–40% कम होती है।',
    isLegume
      ? 'राइजोबियम बीज उपचार करें — यह वायुमंडल से 25–50 kg N/ha स्थिर कर सकता है।'
      : 'जैव उर्वरक रासायनिक उर्वरक की आवश्यकता 20–25% कम कर सकते हैं।',
    'अधिक उर्वरक न डालें — अतिरिक्त उर्वरक भूजल प्रदूषित करता है और मिट्टी को नुकसान पहुंचाता है।',
    method === 'crop'
      ? 'यह सामान्य सिफारिश है। सटीक खुराक के लिए मिट्टी जांच करवाएं।'
      : 'सिफारिश आपकी मिट्टी रिपोर्ट के मानों पर आधारित है।',
  ];

  return {
    crop: cropData.label,
    cropHi: cropData.labelHi,
    areaHectares: Math.round(areaHa * 100) / 100,
    areaDisplay: `${areaValue} ${areaUnit}`,
    method,
    soilUsed: method === 'soil' && !!(soil?.nitrogen !== undefined || soil?.phosphorus !== undefined || soil?.potassium !== undefined),
    requiredN: Math.round(totalN),
    requiredP: Math.round(totalP),
    requiredK: Math.round(totalK),
    deficitN: Math.round(defN),
    deficitP: Math.round(defP),
    deficitK: Math.round(defK),
    nutrientStatus: {
      nitrogen: nStatus,
      phosphorus: pStatus,
      potassium: kStatus,
    },
    organicFirst,
    chemicalFertilizers,
    applicationSchedule: buildSchedule(cropKey, method),
    totalCostMin: chemCostMin + organicCostMin,
    totalCostMax: chemCostMax + organicCostMax,
    tips,
    tipsHi,
    warnings,
    dataLimitations,
  };
}

export const SUPPORTED_CROPS = Object.entries(CROP_NPK).map(([key, v]) => ({
  key,
  label: v.label,
  labelHi: v.labelHi,
}));

export const AREA_UNITS: { value: AreaUnit; label: string; labelHi: string }[] = [
  { value: 'bigha',   label: 'Bigha',    labelHi: 'बीघा' },
  { value: 'acre',    label: 'Acre',     labelHi: 'एकड़' },
  { value: 'hectare', label: 'Hectare',  labelHi: 'हेक्टेयर' },
  { value: 'guntha',  label: 'Guntha',   labelHi: 'गुंठा' },
  { value: 'katha',   label: 'Katha',    labelHi: 'कट्ठा' },
];
