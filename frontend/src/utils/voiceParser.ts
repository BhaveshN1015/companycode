export interface ParsedVoiceData {
  fullName?: string;
  fatherName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobileNumber?: string;
  personalIncome?: number;
  familyIncome?: number;
  totalLandArea?: number;
  landUnit?: 'acres' | 'hectares' | 'bigha';
  farmingCategory?: string;
  hasOtherBusiness?: boolean;
  otherBusinessType?: string;
  state?: string;
  district?: string;
  village?: string;
  tehsil?: string;
  pincode?: string;
}

const HINDI_NUMBERS: Record<string, number> = {
  'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
  'पाँच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
  'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
  'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60, 'सत्तर': 70,
  'अस्सी': 80, 'नब्बे': 90, 'सौ': 100, 'हज़ार': 1000, 'हजार': 1000,
  'लाख': 100000, 'करोड़': 10000000,
};

const HINDI_LAND_UNITS: Record<string, 'acres' | 'hectares' | 'bigha'> = {
  'एकड़': 'acres', 'एकड़': 'acres', 'acres': 'acres', 'acre': 'acres',
  'हेक्टेयर': 'hectares', 'hectares': 'hectares', 'hectare': 'hectares',
  'बीघा': 'bigha', 'bigha': 'bigha',
};

const HINDI_BUSINESS_TYPES: Record<string, string> = {
  'पशुपालन': 'पशुपालन (Animal Husbandry)',
  'मुर्गी': 'मुर्गी पालन (Poultry)',
  'मुर्गी पालन': 'मुर्गी पालन (Poultry)',
  'मछली': 'मत्स्य पालन (Fishery)',
  'मत्स्य': 'मत्स्य पालन (Fishery)',
  'मछली पालन': 'मत्स्य पालन (Fishery)',
  'डेयरी': 'डेयरी (Dairy)',
  'दूध': 'डेयरी (Dairy)',
  'बकरी': 'बकरी पालन (Goat Farming)',
  'बकरी पालन': 'बकरी पालन (Goat Farming)',
  'मधुमक्खी': 'मधुमक्खी पालन (Beekeeping)',
};

const GENDER_MAP: Record<string, string> = {
  'पुरुष': 'Male', 'मर्द': 'Male', 'male': 'Male',
  'महिला': 'Female', 'औरत': 'Female', 'female': 'Female',
};

const FARMING_CATEGORIES: Record<string, string> = {
  'फसल': 'Crop Farming', 'खेती': 'Crop Farming', 'crop': 'Crop Farming',
  'बागवानी': 'Horticulture', 'horticulture': 'Horticulture',
  'डेयरी': 'Dairy', 'dairy': 'Dairy',
  'मिश्रित': 'Mixed Farming', 'mixed': 'Mixed Farming',
};

function parseHindiNumber(text: string): number | null {
  const clean = text.toLowerCase().trim();
  if (HINDI_NUMBERS[clean] !== undefined) return HINDI_NUMBERS[clean];
  const num = Number(clean.replace(/[^0-9.]/g, ''));
  if (!isNaN(num) && num > 0) return num;
  return null;
}

function extractNumber(text: string): number | null {
  const numMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) return Number(numMatch[1]);
  const words = text.split(/[\s,]+/);
  for (const w of words) {
    const hn = parseHindiNumber(w);
    if (hn !== null) return hn;
  }
  return null;
}

function extractLandUnit(text: string): 'acres' | 'hectares' | 'bigha' | null {
  for (const [key, val] of Object.entries(HINDI_LAND_UNITS)) {
    if (text.includes(key)) return val;
  }
  return null;
}

function extractIncome(text: string): number | null {
  let multiplier = 1;
  if (text.includes('लाख')) multiplier = 100000;
  else if (text.includes('हजार') || text.includes('हज़ार')) multiplier = 1000;
  else if (text.includes('करोड़')) multiplier = 10000000;
  const num = extractNumber(text);
  if (num === null) return null;
  if (multiplier > 1) return num * multiplier;
  return num;
}

export function parseVoiceInput(text: string): ParsedVoiceData {
  const result: ParsedVoiceData = {};
  const lower = text.toLowerCase();

  // Name patterns
  const namePatterns = [
    /(?:मेरा नाम|मेरा नाम है|नाम है|नाम)\s+(.+?)(?:\s+है|$|,|।)/i,
    /(?:my name is|i am|name is)\s+(.+?)(?:\.|$|,)/i,
  ];
  for (const p of namePatterns) {
    const m = text.match(p);
    if (m) { result.fullName = m[1].trim(); break; }
  }

  // Father name
  const fatherPatterns = [
    /(?:पिता|पिताजी|बाप|बापू)\s+(?:का नाम)?\s*(.+?)(?:\s+है|$|,|।)/i,
    /(?:father(?:'?s)? name is)\s+(.+?)(?:\.|$|,)/i,
  ];
  for (const p of fatherPatterns) {
    const m = text.match(p);
    if (m) { result.fatherName = m[1].trim(); break; }
  }

  // Gender
  for (const [key, val] of Object.entries(GENDER_MAP)) {
    if (lower.includes(key.toLowerCase())) { result.gender = val; break; }
  }

  // Date of birth
  const dobMatch = text.match(/(?:(\d{4})[-\/](\d{1,2})[-\/](\d{1,2}))|(?:(\d{1,2})[-\/](\d{1,2})[-\/](\d{4}))/);
  if (dobMatch) {
    if (dobMatch[1]) result.dateOfBirth = `${dobMatch[1]}-${dobMatch[2]?.padStart(2, '0')}-${dobMatch[3]?.padStart(2, '0')}`;
    else if (dobMatch[6]) result.dateOfBirth = `${dobMatch[6]}-${dobMatch[5]?.padStart(2, '0')}-${dobMatch[4]?.padStart(2, '0')}`;
  }

  // Mobile number
  const mobileMatch = text.match(/(\d{10})/);
  if (mobileMatch) result.mobileNumber = mobileMatch[1];

  // Land area
  const landPatterns = [
    /([\d.]+)\s*(?:बीघा|एकड़|एकड़|हेक्टेयर|bigha|acres?|hectares?)/i,
    /(?:(\d+)\s*(?:बीघा|एकड़|एकड़|हेक्टेयर|bigha|acres?|hectares?))/i,
    /(?:जमीन|भूमि|land)\s*(?:का)?\s*(?:क्षेत्रफल)?\s*([\d.]+)/i,
  ];
  for (const p of landPatterns) {
    const m = text.match(p);
    if (m) {
      result.totalLandArea = Number(m[1]);
      const unit = extractLandUnit(text);
      if (unit) result.landUnit = unit;
      break;
    }
  }

  // Personal income
  const personalIncomePatterns = [
    /(?:मेरी|मेरा)\s+(?:व्यक्तिगत)?\s*(?:सालाना|सालाना आय|इनकम|आय)\s+(?:रुपये|रुपए|₹)?\s*(.+?)(?:\s+(?:रुपये|रुपए|₹|है))/, 
    /(?:my|personal|annual)\s+(?:income|earning)\s+(?:is\s+)?(?:rs\.?|₹)?\s*(.+?)(?:\s+rupees)?/i,
  ];
  for (const p of personalIncomePatterns) {
    const m = text.match(p);
    if (m) {
      const income = extractIncome(m[1]);
      if (income !== null) result.personalIncome = income;
      break;
    }
  }

  // Family income
  const familyIncomePatterns = [
    /(?:फैमिली|परिवार|घर)\s+(?:की)?\s*(?:सालाना|इनकम|आय)\s+(?:रुपये|रुपए|₹)?\s*(.+?)(?:\s+(?:रुपये|रुपए|₹|है))/,
    /(?:family|household)\s+(?:income|earning)\s+(?:is\s+)?(?:rs\.?|₹)?\s*(.+?)(?:\s+rupees)?/i,
  ];
  for (const p of familyIncomePatterns) {
    const m = text.match(p);
    if (m) {
      const income = extractIncome(m[1]);
      if (income !== null) result.familyIncome = income;
      break;
    }
  }

  // Other business
  const businessYesPatterns = [
    /(?:मैं|हम)\s+(?:भी)?\s*(?:करता हूं|करती हूं|करते हैं)/,
    /(?:जी हां|हां|yes|also)/i,
  ];
  for (const p of businessYesPatterns) {
    if (p.test(text)) {
      result.hasOtherBusiness = true;
      // Extract business type
      for (const [key, val] of Object.entries(HINDI_BUSINESS_TYPES)) {
        if (text.includes(key)) { result.otherBusinessType = val; break; }
      }
      break;
    }
  }
  if (/नहीं|no|नहीं करते/i.test(text) && result.hasOtherBusiness === undefined) {
    result.hasOtherBusiness = false;
  }

  // Farming category
  for (const [key, val] of Object.entries(FARMING_CATEGORIES)) {
    if (lower.includes(key.toLowerCase())) { result.farmingCategory = val; break; }
  }

  // Location patterns
  const statePatterns = [
    /(?:राज्य|state)\s+(.+?)(?:\s+में|$|,|।)/i,
    /(?:में|से)\s+(.+?)\s+(?:राज्य|state)/i,
  ];
  for (const p of statePatterns) {
    const m = text.match(p);
    if (m) { result.state = m[1].trim(); break; }
  }

  const districtPatterns = [
    /(?:जिला|जिले|district)\s+(.+?)(?:\s+में|$|,|।)/i,
  ];
  for (const p of districtPatterns) {
    const m = text.match(p);
    if (m) { result.district = m[1].trim(); break; }
  }

  const villagePatterns = [
    /(?:गांव|गाँव|village)\s+(.+?)(?:\s+में|$|,|।)/i,
  ];
  for (const p of villagePatterns) {
    const m = text.match(p);
    if (m) { result.village = m[1].trim(); break; }
  }

  // Pincode
  const pincodeMatch = text.match(/(\d{6})/);
  if (pincodeMatch) result.pincode = pincodeMatch[1];

  return result;
}
