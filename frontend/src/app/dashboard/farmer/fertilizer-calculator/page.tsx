'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { usePageContext } from '@/hooks/usePageContext';
import {
  fetchMeta,
  fetchSoilReports,
  calculateFertilizer,
  type CropMeta,
  type AreaUnitMeta,
  type AreaUnit,
  type CalcMethod,
  type SoilReportSummary,
  type FertilizerResult,
  type FertilizerAIResponse,
} from '@/services/fertilizerCalculator';
import { uploadSoilReport } from '@/services/soilHealth';
import { shopkeeperApi } from '@/services/shopkeeperApi';
import { ShopRecommendationList, type ShopMatch } from '@/components/shopkeeper/ShopRecommendationCard';
import {
  FaArrowLeft, FaCheck, FaFlask, FaLeaf, FaSeedling,
  FaUpload, FaCamera, FaTimes, FaSpinner, FaInfoCircle,
  FaClipboardCheck, FaRobot, FaMicrophone, FaMicrophoneSlash, FaMapMarkerAlt,
  FaChevronDown, FaChevronUp,
} from 'react-icons/fa';

const FarmerSidebar = dynamic(() => import('@/components/FarmerSidebar'), { ssr: false });

const HINDI_NUMBERS: Record<string, number> = {
  'एक': 1, 'एका': 1, 'एके': 1,
  'दो': 2, 'दु': 2, 'दू': 2,
  'तीन': 3, 'ती': 3, 'तिन': 3,
  'चार': 4, 'चा': 4,
  'पांच': 5, 'पाँच': 5, 'पां': 5, 'पाच': 5,
  'छह': 6, 'छः': 6, 'छै': 6, 'छे': 6,
  'सात': 7, 'सा': 7,
  'आठ': 8, 'अठ': 8,
  'नौ': 9, 'नऊ': 9,
  'दस': 10, 'दश': 10,
  'ग्यारह': 11, 'ग्यार': 11,
  'बारह': 12, 'बार': 12,
  'तेरह': 13, 'तेर': 13,
  'चौदह': 14, 'चौद': 14,
  'पंद्रह': 15, 'पंद': 15,
  'सोलह': 16, 'सोल': 16,
  'सत्रह': 17, 'सत्र': 17,
  'अठारह': 18, 'अठार': 18,
  'उन्नीस': 19, 'उनीस': 19,
  'बीस': 20,
  'इक्कीस': 21,
  'बाईस': 22,
  'तेईस': 23,
  'चौबीस': 24,
  'पच्चीस': 25,
  'छब्बीस': 26,
  'सत्ताईस': 27,
  'अट्ठाईस': 28,
  'उनतीस': 29,
  'तीस': 30,
  'चालीस': 40,
  'पचास': 50,
  'साठ': 60,
  'सत्तर': 70,
  'अस्सी': 80,
  'नब्बे': 90,
  'सौ': 100,
};

const CROP_NAME_MAP: Record<string, string> = {
  'गेहूं': 'wheat', 'गेहूँ': 'wheat', 'gehu': 'wheat', 'gehun': 'wheat',
  'धान': 'rice', 'चावल': 'rice', 'paddy': 'rice', 'dhan': 'rice',
  'मक्का': 'maize', 'मकई': 'maize', 'makka': 'maize', 'makkai': 'maize', 'bhutta': 'maize',
  'कपास': 'cotton', 'cotton': 'cotton', 'kapas': 'cotton',
  'मूंग': 'green_gram', 'moong': 'green_gram', 'mung': 'green_gram',
  'चना': 'gram', 'chana': 'gram', 'chickpea': 'gram',
  'सरसों': 'mustard', 'sarson': 'mustard', 'mustard': 'mustard',
  'बाजरा': 'pearl_millet', 'bajra': 'pearl_millet',
  'जौ': 'barley', 'jau': 'barley', 'barley': 'barley',
  'आलू': 'potato', 'aloo': 'potato', 'potato': 'potato',
  'प्याज': 'onion', 'pyaz': 'onion', 'onion': 'onion',
  'टमाटर': 'tomato', 'tamatar': 'tomato', 'tomato': 'tomato',
  'गन्ना': 'sugarcane', 'ganna': 'sugarcane', 'sugarcane': 'sugarcane',
  'सोयाबीन': 'soybean', 'soybean': 'soybean', 'soyabean': 'soybean',
  'अमरूद': 'guava', 'amrood': 'guava', 'amrud': 'guava', 'guava': 'guava',
  'आम': 'mango', 'aam': 'mango', 'mango': 'mango',
  'केला': 'banana', 'kela': 'banana', 'banana': 'banana',
  'अनार': 'pomegranate', 'anar': 'pomegranate', 'pomegranate': 'pomegranate',
  'बैंगन': 'brinjal', 'baingan': 'brinjal', 'eggplant': 'brinjal',
  'मिर्च': 'chili', 'mirch': 'chili', 'chili': 'chili', 'chilli': 'chili',
  'लहसुन': 'garlic', 'lahsun': 'garlic', 'garlic': 'garlic',
  'अदरक': 'ginger', 'adrak': 'ginger', 'ginger': 'ginger',
  'हल्दी': 'turmeric', 'haldi': 'turmeric', 'turmeric': 'turmeric',
  'धनिया': 'coriander', 'dhania': 'coriander', 'coriander': 'coriander',
  'मेथी': 'fenugreek', 'methi': 'fenugreek', 'fenugreek': 'fenugreek',
  'पालक': 'spinach', 'palak': 'spinach', 'spinach': 'spinach',
  'गोभी': 'cauliflower', 'gobhi': 'cauliflower', 'cauliflower': 'cauliflower',
  'मटर': 'pea', 'matar': 'pea', 'pea': 'pea',
  'राजमा': 'kidney_bean', 'rajma': 'kidney_bean',
  'लोबिया': 'cowpea', 'lobiya': 'cowpea', 'cowpea': 'cowpea',
  'ककड़ी': 'cucumber', 'kakdi': 'cucumber', 'cucumber': 'cucumber',
  'तरबूज': 'watermelon', 'tarbooj': 'watermelon', 'watermelon': 'watermelon',
  'खरबूज': 'muskmelon', 'kharbooj': 'muskmelon', 'muskmelon': 'muskmelon',
};

const AREA_UNIT_MAP: Record<string, AreaUnit> = {
  'बीघा': 'bigha', 'bigha': 'bigha', 'beegha': 'bigha',
  'एकड़': 'acre', 'acre': 'acre', 'ekad': 'acre', 'ekar': 'acre',
  'हेक्टेयर': 'hectare', 'hectare': 'hectare', 'ha': 'hectare',
};

const LANG_MAP: Record<string, string> = {
  'hi': 'hi-IN', 'en': 'en-IN', 'raj': 'hi-IN', 'mwr': 'hi-IN',
  'pa': 'pa-IN', 'gu': 'gu-IN', 'mr': 'mr-IN', 'bn': 'bn-IN',
  'ta': 'ta-IN', 'te': 'te-IN', 'kn': 'kn-IN', 'ml': 'ml-IN', 'ur': 'ur-IN',
};

function parseHindiNumbers(text: string): string {
  let result = text;
  const sortedKeys = Object.keys(HINDI_NUMBERS).sort((a, b) => b.length - a.length);
  for (const hindi of sortedKeys) {
    result = result.replace(new RegExp(hindi, 'g'), ` ${HINDI_NUMBERS[hindi]} `);
  }
  return result;
}

function extractCrop(text: string, crops: CropMeta[]): string {
  const lower = text.toLowerCase();
  for (const [alias, canonical] of Object.entries(CROP_NAME_MAP)) {
    if (lower.includes(alias.toLowerCase())) return canonical;
  }
  for (const c of crops) {
    if (lower.includes(c.key.toLowerCase())) return c.key;
    if (lower.includes(c.label.toLowerCase())) return c.key;
    if (c.labelHi && lower.includes(c.labelHi.toLowerCase())) return c.key;
  }
  return '';
}

function extractArea(text: string): { value: number; unit: AreaUnit } | null {
  const normalized = parseHindiNumbers(text);
  const match = normalized.match(/([\d.]+)\s*(bigha|beekha|acre|ekad|ekar|hectare|ha|बीघा|एकड़|हेक्टेयर)?/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (isNaN(value) || value <= 0) return null;
  const unitText = (match[2] || 'bigha').toLowerCase();
  const unit = AREA_UNIT_MAP[unitText] || 'bigha';
  return { value, unit };
}

interface VoiceParseResult {
  crop?: string;
  area?: number;
  unit?: AreaUnit;
  rawText: string;
}

function parseVoiceInput(text: string, crops: CropMeta[]): VoiceParseResult {
  const result: VoiceParseResult = { rawText: text };
  result.crop = extractCrop(text, crops);
  const area = extractArea(text);
  if (area) {
    result.area = area.value;
    result.unit = area.unit;
  }
  return result;
}

export default function FertilizerCalculatorPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [crops, setCrops] = useState<CropMeta[]>([]);
  const [areaUnits, setAreaUnits] = useState<AreaUnitMeta[]>([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [areaValue, setAreaValue] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('bigha');
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeField, setActiveField] = useState<'crop' | 'area' | 'full' | null>(null);
  const [voiceConfirmations, setVoiceConfirmations] = useState<string[]>([]);
  const [savedReports, setSavedReports] = useState<SoilReportSummary[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showReportSelector, setShowReportSelector] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<FertilizerResult | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<FertilizerAIResponse | null>(null);
  const [error, setError] = useState('');
  const [metaLoading, setMetaLoading] = useState(true);
  const [appLanguage, setAppLanguage] = useState('hi');
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [shopRecommendations, setShopRecommendations] = useState<ShopMatch[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  const recognitionRef = useRef<any>(null);

  usePageContext({
    pageContext: 'fertilizer',
    soilData: result
      ? { healthScore: result.soilUsed ? 1 : 0, nitrogen: String(result.deficitN), phosphorus: String(result.deficitP), potassium: String(result.deficitK) }
      : undefined,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    loadMeta();
    const storedLang = localStorage.getItem('appLanguage') || 'hi';
    setAppLanguage(storedLang);
  }, [isAuthenticated, isLoading]);

  const loadMeta = async () => {
    try {
      const meta = await fetchMeta();
      setCrops(meta.crops);
      setAreaUnits(meta.areaUnits);
      if (meta.areaUnits.length > 0) setAreaUnit(meta.areaUnits[0].value);
    } catch {
      setError('डेटा लोड करने में समस्या हुई');
    } finally {
      setMetaLoading(false);
    }
  };

  const loadSavedReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const reports = await fetchSoilReports();
      setSavedReports(reports);
      if (reports.length === 1) {
        setSelectedReportId(reports[0]._id);
      } else if (reports.length > 1 && !selectedReportId) {
        setSelectedReportId(reports[0]._id);
      }
      return reports;
    } catch {
      setSavedReports([]);
      return [];
    } finally {
      setReportsLoading(false);
    }
  }, [selectedReportId]);

  useEffect(() => {
    if (isAuthenticated && !result) {
      loadSavedReports();
    }
  }, [isAuthenticated, result, loadSavedReports]);

  const getSpeechLang = () => LANG_MAP[appLanguage] || 'hi-IN';

  const startListening = (field: 'crop' | 'area' | 'full') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('आपके ब्राउज़र में voice input सपोर्ट नहीं है। कृपया टाइप करें।');
      return;
    }
    setActiveField(field);
    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLang();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => { setIsListening(false); setActiveField(null); };
    recognition.onerror = () => { setIsListening(false); setActiveField(null); };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      processVoiceInput(transcript, field);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    setActiveField(null);
  };

  const processVoiceInput = (text: string, field: 'crop' | 'area' | 'full') => {
    const parsed = parseVoiceInput(text, crops);
    const confirmations: string[] = [];

    if (field === 'crop') {
      if (parsed.crop) {
        setSelectedCrop(parsed.crop);
        const cropLabel = crops.find(c => c.key === parsed.crop)?.labelHi || crops.find(c => c.key === parsed.crop)?.label || parsed.crop;
        confirmations.push(`फसल: ${cropLabel} ✓`);
      } else {
        confirmations.push('फसल नहीं समझा — कृपया फिर बोलें या टाइप करें');
      }
    } else if (field === 'area') {
      if (parsed.area) {
        setAreaValue(String(parsed.area));
        if (parsed.unit) setAreaUnit(parsed.unit);
        confirmations.push(`क्षेत्रफल: ${parsed.area} ${parsed.unit === 'bigha' ? 'बीघा' : parsed.unit === 'acre' ? 'एकड़' : 'हेक्टेयर'} ✓`);
      } else {
        confirmations.push('क्षेत्रफल नहीं समझा — कृपया फिर बोलें या टाइप करें');
      }
    } else {
      if (parsed.crop) {
        setSelectedCrop(parsed.crop);
        const cropLabel = crops.find(c => c.key === parsed.crop)?.labelHi || crops.find(c => c.key === parsed.crop)?.label || parsed.crop;
        confirmations.push(`फसल: ${cropLabel} ✓`);
      }
      if (parsed.area) {
        setAreaValue(String(parsed.area));
        if (parsed.unit) setAreaUnit(parsed.unit);
        confirmations.push(`क्षेत्रफल: ${parsed.area} ${parsed.unit === 'bigha' ? 'बीघा' : parsed.unit === 'acre' ? 'एकड़' : 'हेक्टेयर'} ✓`);
      }
      if (!parsed.crop && !parsed.area) {
        confirmations.push('कृपया फिर बोलें — फसल या क्षेत्रफल समझ नहीं आया');
      }
    }

    setVoiceConfirmations(confirmations);
    setTimeout(() => setVoiceConfirmations([]), 4000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStage('अपलोड हो रहा है...');
    setError('');
    setUploadSuccess(false);
    try {
      setUploadStage('AI विश्लेषण...');
      await uploadSoilReport(file, (stage) => setUploadStage(stage));
      setUploadStage('पूर्ण');
      setUploadSuccess(true);
      const reports = await loadSavedReports();
      if (reports.length > 0) setSelectedReportId(reports[0]._id);
    } catch (err: any) {
      setError(err.message || 'अपलोड विफल रही');
      setUploadSuccess(false);
    } finally {
      setUploading(false);
      setUploadStage('');
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    try {
      if (!selectedCrop) { setError('कृपया फसल चुनें या बताएं'); setCalculating(false); return; }
      if (!areaValue || parseFloat(areaValue) <= 0) { setError('कृपया सही क्षेत्रफल दर्ज करें'); setCalculating(false); return; }
      const method: CalcMethod = selectedReportId ? 'soil' : 'crop';
      const payload: { crop: string; areaValue: number; areaUnit: AreaUnit; method: CalcMethod; soilReportId?: string } = {
        crop: selectedCrop,
        areaValue: parseFloat(areaValue),
        areaUnit,
        method,
      };
      if (selectedReportId) payload.soilReportId = selectedReportId;
      const res = await calculateFertilizer(payload);
      setResult(res.calculation);
      setAiRecommendation(res.ai);
      fetchShopRecommendations(res.calculation);
    } catch (err: any) {
      setError(err.message || 'गणना विफल रही');
    } finally {
      setCalculating(false);
    }
  };

  const fetchShopRecommendations = async (calculation: FertilizerResult) => {
    setShopsLoading(true);
    setShopRecommendations([]);
    try {
      const requirements: Array<{ productName: string; category: string; quantity?: number; unit?: string }> = [];

      calculation.chemicalFertilizers.forEach(f => {
        requirements.push({ productName: f.name, category: 'fertilizer', quantity: f.quantityKg, unit: 'kg' });
      });
      calculation.organicFirst.forEach(o => {
        requirements.push({ productName: o.name, category: 'organic', quantity: parseInt(o.quantity) || 0, unit: 'kg' });
      });

      if (!requirements.length) return;

      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const { shops } = await shopkeeperApi.findShops({
        requirements,
        farmerLocation: {
          village: user?.location?.village,
          district: user?.location?.district,
          state: user?.location?.state,
          latitude: user?.location?.coordinates?.latitude,
          longitude: user?.location?.coordinates?.longitude,
        },
        maxResults: 5,
      });

      setShopRecommendations(shops || []);
    } catch {
    } finally {
      setShopsLoading(false);
    }
  };

  const resetCalculator = () => {
    setSelectedCrop('');
    setAreaValue('');
    setVoiceText('');
    setVoiceConfirmations([]);
    setResult(null);
    setAiRecommendation(null);
    setError('');
    setShowDetailedView(false);
    loadSavedReports();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (metaLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <FarmerSidebar open={true} onClose={() => undefined} />
        <div className="flex-1 flex items-center justify-center">
          <FaSpinner className="animate-spin text-3xl text-emerald-600" />
        </div>
      </div>
    );
  }

  const selectedCropLabel = crops.find(c => c.key === selectedCrop)?.labelHi || crops.find(c => c.key === selectedCrop)?.label || '';
  const selectedCropHi = crops.find(c => c.key === selectedCrop)?.labelHi || '';
  const hasReports = savedReports.length > 0;
  const selectedReport = savedReports.find(r => r._id === selectedReportId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm text-emerald-700 font-medium">लोड हो रहा है…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <FarmerSidebar open={true} onClose={() => undefined} />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm gap-3">
          <Link href="/dashboard/farmer" className="text-sm text-slate-500 hover:text-emerald-700 flex items-center gap-1">
            <FaArrowLeft className="text-xs" /> Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-lg font-bold text-slate-800">खाद कैलकुलेटर</h1>
        </header>

        <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 flex items-center gap-2">
              <FaInfoCircle /> {error}
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><FaTimes /></button>
            </div>
          )}

          {voiceConfirmations.length > 0 && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
              {voiceConfirmations.map((msg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <FaCheck className="text-emerald-500" /> {msg}
                </div>
              ))}
            </div>
          )}

          {!result ? (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">खाद कैलकुलेटर</h2>
                <p className="text-sm text-slate-500">अपनी फसल और खेत की जानकारी दें</p>
              </div>

              {/* Voice Input - Compact */}
              <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={isListening && activeField === 'full' ? stopListening : () => startListening('full')}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition flex-shrink-0 ${
                      isListening && activeField === 'full' ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isListening && activeField === 'full' ? <FaMicrophoneSlash className="text-lg" /> : <FaMicrophone className="text-lg" />}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-700">
                      {isListening && activeField === 'full' ? 'सुन रहा हूं... बोलें' : '🎤 बोलकर बताएं'}
                    </p>
                    <p className="text-xs text-slate-500">
                      जैसे: "मेरे पास दस बीघा जमीन है और अमरूद की फसल है"
                    </p>
                  </div>
                </div>
                {voiceText && (
                  <div className="mt-3 p-2 bg-white/70 rounded-lg text-xs text-slate-600">
                    "{voiceText}"
                  </div>
                )}
              </div>

              {/* Crop Input with Mic */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><FaLeaf /></div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">फसल</h3>
                    <p className="text-xs text-slate-500">अपनी फसल का नाम लिखें या बोलें</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedCrop ? (selectedCropLabel || selectedCrop) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const crop = extractCrop(val, crops);
                      setSelectedCrop(crop || val);
                    }}
                    placeholder="जैसे: गेहूं, धान, मक्का, कपास..."
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                  />
                  <button
                    onClick={isListening && activeField === 'crop' ? stopListening : () => startListening('crop')}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition flex-shrink-0 ${
                      isListening && activeField === 'crop' ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                    }`}
                  >
                    {isListening && activeField === 'crop' ? <FaMicrophoneSlash /> : <FaMicrophone />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['गेहूं', 'धान', 'मक्का', 'कपास', 'मूंग', 'चना', 'सरसों', 'बाजरा'].map((name) => (
                    <button
                      key={name}
                      onClick={() => setSelectedCrop(CROP_NAME_MAP[name] || name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        selectedCrop === (CROP_NAME_MAP[name] || name)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area Input with Mic */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><FaMapMarkerAlt /></div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">खेत का क्षेत्रफल</h3>
                    <p className="text-xs text-slate-500">अपने खेत का आकार बताएं</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={areaValue}
                    onChange={(e) => setAreaValue(e.target.value)}
                    placeholder="जैसे: 3"
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                  />
                  <button
                    onClick={isListening && activeField === 'area' ? stopListening : () => startListening('area')}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition flex-shrink-0 ${
                      isListening && activeField === 'area' ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    {isListening && activeField === 'area' ? <FaMicrophoneSlash /> : <FaMicrophone />}
                  </button>
                  <select
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                  >
                    {areaUnits.map((u) => (
                      <option key={u.value} value={u.value}>{u.labelHi || u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Soil Report Section */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><FaFlask /></div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-800">मिट्टी की रिपोर्ट</h3>
                    <p className="text-xs text-slate-500">वैकल्पिक — रिपोर्ट अपने-आप इस्तेमाल होगी</p>
                  </div>
                </div>

                {reportsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FaSpinner className="animate-spin" /> रिपोर्ट खोज रहे हैं...
                  </div>
                ) : uploadSuccess ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <FaCheck /> मिट्टी की रिपोर्ट उपलब्ध है ✓
                    </div>
                  </div>
                ) : hasReports ? (
                  <div className="space-y-3">
                    {savedReports.length === 1 ? (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                        <div className="flex items-center gap-2 text-sm text-emerald-700">
                          <FaCheck /> मिट्टी की रिपोर्ट उपलब्ध है ✓
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {savedReports[0].soilType || 'Soil Report'} • {formatDate(savedReports[0].createdAt)}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowReportSelector(!showReportSelector)}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-emerald-300 transition"
                        >
                          <span className="text-sm text-slate-700">
                            {selectedReport ? `${selectedReport.soilType || 'Report'} • ${formatDate(selectedReport.createdAt)}` : 'रिपोर्ट चुनें'}
                          </span>
                          {showReportSelector ? <FaChevronUp className="text-slate-400" /> : <FaChevronDown className="text-slate-400" />}
                        </button>
                        {showReportSelector && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {savedReports.map((r) => (
                              <button
                                key={r._id}
                                onClick={() => { setSelectedReportId(r._id); setShowReportSelector(false); }}
                                className={`w-full p-3 rounded-xl border text-left transition ${
                                  selectedReportId === r._id
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-gray-200 hover:border-emerald-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-800">{r.soilType || 'Soil Report'}</span>
                                  {selectedReportId === r._id && <FaCheck className="text-emerald-600" />}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {formatDate(r.createdAt)} • N: {r.nitrogen ?? '—'} P: {r.phosphorus ?? '—'} K: {r.potassium ?? '—'}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500">कोई रिपोर्ट नहीं मिली। बिना रिपोर्ट भी गणना होगी।</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition disabled:opacity-50"
                      >
                        <FaUpload /> रिपोर्ट जोड़ें
                      </button>
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition disabled:opacity-50"
                      >
                        <FaCamera /> फोटो लें
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
                    <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <FaSpinner className="animate-spin" /> {uploadStage}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-lg font-bold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {calculating ? (
                  <><FaSpinner className="animate-spin" /> गणना हो रही है...</>
                ) : (
                  'खाद की मात्रा निकालें'
                )}
              </button>
            </div>
          ) : (
            /* RESULT */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">आपके खेत के लिए खाद की सिफारिश</h2>
                <p className="text-sm text-slate-500">{selectedCropHi || result.crop} • {result.areaDisplay}</p>
              </div>

              {/* Data source message */}
              <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
                result.soilUsed ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}>
                <FaInfoCircle />
                {result.soilUsed
                  ? 'यह सलाह आपकी मिट्टी की रिपोर्ट और फसल की आवश्यकता के आधार पर तैयार की गई है।'
                  : 'मिट्टी की रिपोर्ट उपलब्ध नहीं है। यह सामान्य फसल आवश्यकता के आधार पर अनुमान है।'}
              </div>

              {/* Main Nutrient Need */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-lime-50 border border-emerald-200 p-6">
                <h3 className="text-base font-bold text-emerald-800 mb-4 flex items-center gap-2">
                  <FaSeedling /> मुख्य जरूरत
                </h3>
                <div className="space-y-3">
                  {result.deficitN > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-sm font-medium text-slate-700">नाइट्रोजन (N)</span>
                      <span className="text-lg font-bold text-emerald-700">{result.deficitN} किलो</span>
                    </div>
                  )}
                  {result.deficitP > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-sm font-medium text-slate-700">फॉस्फोरस (P)</span>
                      <span className="text-lg font-bold text-emerald-700">{result.deficitP} किलो</span>
                    </div>
                  )}
                  {result.deficitK > 0 && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100">
                      <span className="text-sm font-medium text-slate-700">पोटाश (K)</span>
                      <span className="text-lg font-bold text-emerald-700">{result.deficitK} किलो</span>
                    </div>
                  )}
                  {result.deficitN === 0 && result.deficitP === 0 && result.deficitK === 0 && (
                    <p className="text-sm text-slate-600">मिट्टी में पोषक तत्व पर्याप्त हैं — कोई अतिरिक्त जरूरत नहीं।</p>
                  )}
                </div>
              </div>

              {/* Fertilizer Recommendation */}
              {result.chemicalFertilizers.length > 0 && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FaFlask /> सुझाया गया खाद
                  </h3>
                  <div className="space-y-4">
                    {result.chemicalFertilizers.map((c, i) => (
                      <div key={i} className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">{c.nameHi || c.name}</span>
                          <span className="text-lg font-bold text-blue-700">{c.quantityKg} किलो</span>
                        </div>
                        <div className="text-xs text-slate-600 mb-2">{c.nutrientProvided}</div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <div><span className="font-medium">NPK अनुपात:</span> {c.npkRatio}</div>
                          <div><span className="font-medium">कब डालें:</span> {c.applicationTiming}</div>
                          <div><span className="font-medium">कैसे डालें:</span> {c.applicationMethod}</div>
                          <div><span className="font-medium">अनुमानित लागत:</span> {c.costEstimate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed View Toggle */}
              <button
                onClick={() => setShowDetailedView(!showDetailedView)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-200 text-sm text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition"
              >
                {showDetailedView ? <><FaChevronUp /> कम दिखाएं</> : <><FaChevronDown /> विस्तृत जानकारी देखें</>}
              </button>

              {/* Detailed Nutrient Status */}
              {showDetailedView && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-4">पोषक तत्व विवरण</h3>
                  <div className="space-y-3">
                    {(['nitrogen', 'phosphorus', 'potassium'] as const).map((nutrient) => {
                      const status = result.nutrientStatus[nutrient];
                      const nameMap = { nitrogen: 'नाइट्रोजन (N)', phosphorus: 'फॉस्फोरस (P)', potassium: 'पोटाश (K)' };
                      const stateMap = { adequate: 'पर्याप्त', low: 'कम', deficient: 'बहुत कम', data_unavailable: 'जानकारी नहीं' };
                      const colorMap = { adequate: 'bg-emerald-50 border-emerald-200', low: 'bg-yellow-50 border-yellow-200', deficient: 'bg-red-50 border-red-200', data_unavailable: 'bg-slate-50 border-slate-200' };
                      return (
                        <div key={nutrient} className={`rounded-xl border p-3 ${colorMap[status.state]}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-slate-800">{nameMap[nutrient]}</span>
                            <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-white">{stateMap[status.state]}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                            <div>आवश्यक: <span className="font-semibold">{status.required} kg</span></div>
                            <div>उपलब्ध: <span className="font-semibold">{status.available !== null ? `${status.available} kg` : '—'}</span></div>
                            <div>कमी: <span className="font-semibold">{status.deficit} kg</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Organic Fertilizer Section */}
              {result.organicFirst.length > 0 && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                  <h3 className="text-base font-bold text-green-700 mb-4 flex items-center gap-2">
                    <FaLeaf /> जैविक खाद का विकल्प
                  </h3>
                  <div className="space-y-4">
                    {result.organicFirst.map((o, i) => (
                      <div key={i} className="p-4 rounded-xl bg-green-50 border border-green-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800">{o.nameHi || o.name}</span>
                          <span className="font-bold text-green-700">{o.quantity}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">{o.benefitHi || o.benefit}</p>
                        <div className="text-xs text-slate-500 space-y-1">
                          <div><span className="font-medium">कैसे डालें:</span> {o.applicationMethod}</div>
                          <div><span className="font-medium">कब डालें:</span> {o.applicationTiming}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendation */}
              {aiRecommendation && (
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FaRobot className="text-indigo-600" />
                    <h3 className="text-base font-bold text-indigo-800">AI सलाह</h3>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                      aiRecommendation.aiGenerated ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {aiRecommendation.aiGenerated ? (aiRecommendation.cached ? 'AI (Cached)' : 'AI') : 'Standard'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{aiRecommendation.summaryHi || aiRecommendation.summary}</p>
                  {aiRecommendation.warnings.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {aiRecommendation.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                          <FaInfoCircle className="mt-0.5 flex-shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Application Schedule */}
              {result.applicationSchedule.length > 0 && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FaClipboardCheck /> कब डालें
                  </h3>
                  <div className="space-y-3">
                    {result.applicationSchedule.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                        <div>
                          <div className="font-semibold text-slate-800">{s.stageHi || s.stage}</div>
                          <div className="text-sm text-slate-600">{s.products}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {result.tipsHi?.length > 0 && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-3">कैसे डालें</h3>
                  <ul className="space-y-2">
                    {result.tipsHi.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <FaCheck className="text-emerald-500 mt-0.5 flex-shrink-0 text-xs" /> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cost */}
              <div className="rounded-2xl bg-emerald-600 text-white p-6 text-center">
                <div className="text-sm opacity-80">अनुमानित कुल लागत</div>
                <div className="text-3xl font-extrabold mt-1">₹{result.totalCostMin.toLocaleString()} – ₹{result.totalCostMax.toLocaleString()}</div>
              </div>

              {/* Shop Recommendations */}
              {(shopsLoading || shopRecommendations.length > 0) && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-emerald-600" /> आसपास की उपलब्ध दुकानें
                  </h3>
                  {shopsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <FaSpinner className="animate-spin text-emerald-600" />
                      <span className="ml-2 text-sm text-gray-500">दुकानें खोज रहे हैं...</span>
                    </div>
                  ) : (
                    <ShopRecommendationList
                      shops={shopRecommendations}
                      title=""
                      emptyMessage="आसपास कोई दुकान उपलब्ध नहीं है जिसमें ये उत्पद हों।"
                    />
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={resetCalculator} className="flex-1 py-3 rounded-xl border border-emerald-500 text-emerald-700 font-semibold hover:bg-emerald-50 transition">
                  नई गणना करें
                </button>
                <button onClick={() => router.push('/dashboard/farmer/market')} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition">
                  खाद खरीदें →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}