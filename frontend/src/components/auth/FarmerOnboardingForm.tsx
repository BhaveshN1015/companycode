"use client";

import { useState, useEffect, useCallback } from 'react';
import { FaUser, FaMapMarkerAlt, FaSeedling, FaMoneyBillWave, FaCrosshairs, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { reverseGeocode } from '@/services/locationService';
import VoiceFieldInput from '@/components/VoiceFieldInput';
import { parseVoiceInput, type ParsedVoiceData } from '@/utils/voiceParser';

export interface FarmerOnboardingData {
  fullName: string;
  fatherName: string;
  gender: string;
  dateOfBirth: string;
  mobileNumber: string;
  personalIncome: string;
  familyIncome: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  pincode: string;
  totalLandArea: string;
  landUnit: 'acres' | 'hectares' | 'bigha';
  farmingCategory: string;
  annualIncomeRange: string;
  hasOtherBusiness: boolean;
  otherBusinessType: string;
  otherBusinessDetails: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const COMMON_CROPS = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Pulses', 'Oilseeds', 'Vegetables', 'Fruits', 'Tea', 'Coffee', 'Other'];

const INCOME_RANGES = [
  'Below ₹1,00,000',
  '₹1,00,000 - ₹2,00,000',
  '₹2,00,000 - ₹4,00,000',
  '₹4,00,000 - ₹6,00,000',
  '₹6,00,000 - ₹10,00,000',
  'Above ₹10,00,000',
];

const FARMLAND_UNITS = [
  { value: 'acres', label: 'Acres' },
  { value: 'hectares', label: 'Hectares' },
  { value: 'bigha', label: 'Bigha' },
];

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const OTHER_BUSINESS_TYPES = [
  'पशुपालन (Animal Husbandry)',
  'मुर्गी पालन (Poultry)',
  'मत्स्य पालन (Fishery)',
  'डेयरी (Dairy)',
  'बकरी पालन (Goat Farming)',
  'मधुमक्खी पालन (Beekeeping)',
  'अन्य कृषि-संबंधित व्यवसाय',
];

export interface FarmerOnboardingFormProps {
  initial?: Partial<FarmerOnboardingData>;
  loading?: boolean;
  onSubmit: (data: FarmerOnboardingData) => void;
}

const emptyState = (): FarmerOnboardingData => ({
  fullName: '',
  fatherName: '',
  gender: '',
  dateOfBirth: '',
  mobileNumber: '',
  personalIncome: '',
  familyIncome: '',
  state: '',
  district: '',
  tehsil: '',
  village: '',
  pincode: '',
  totalLandArea: '',
  landUnit: 'acres',
  farmingCategory: '',
  annualIncomeRange: '',
  hasOtherBusiness: false,
  otherBusinessType: '',
  otherBusinessDetails: '',
});

export default function FarmerOnboardingForm({ initial, loading, onSubmit }: FarmerOnboardingFormProps) {
  const [data, setData] = useState<FarmerOnboardingData>({ ...emptyState(), ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof FarmerOnboardingData, v: any) => setData((d) => ({ ...d, [k]: v }));

  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setLocError('Location is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (geo) {
        set('state', (geo.state || '').trim() || data.state);
        set('district', (geo.district || '').trim() || data.district);
        set('village', (geo.village || '').trim() || data.village);
      } else {
        setLocError('Could not detect location. Please enter manually.');
      }
    } catch {
      setLocError('Location permission denied or unavailable. Please enter manually.');
    } finally {
      setLocating(false);
    }
  };

  // Automatically try to detect the farmer's location once the form mounts.
  useEffect(() => {
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoiceInput = useCallback((field: keyof FarmerOnboardingData) => {
    return (text: string) => {
      const parsed = parseVoiceInput(text);
      if (field === 'fullName' && parsed.fullName) set('fullName', parsed.fullName);
      else if (field === 'fatherName' && parsed.fatherName) set('fatherName', parsed.fatherName);
      else if (field === 'mobileNumber' && parsed.mobileNumber) set('mobileNumber', parsed.mobileNumber);
      else if (field === 'personalIncome' && parsed.personalIncome) set('personalIncome', String(parsed.personalIncome));
      else if (field === 'familyIncome' && parsed.familyIncome) set('familyIncome', String(parsed.familyIncome));
      else if (field === 'totalLandArea' && parsed.totalLandArea) set('totalLandArea', String(parsed.totalLandArea));
      else if (field === 'landUnit' && parsed.landUnit) set('landUnit', parsed.landUnit);
      else if (field === 'state' && parsed.state) set('state', parsed.state);
      else if (field === 'district' && parsed.district) set('district', parsed.district);
      else if (field === 'village' && parsed.village) set('village', parsed.village);
      else if (field === 'pincode' && parsed.pincode) set('pincode', parsed.pincode);
      else if (field === 'hasOtherBusiness' && parsed.hasOtherBusiness !== undefined) set('hasOtherBusiness', parsed.hasOtherBusiness);
      else if (field === 'otherBusinessType' && parsed.otherBusinessType) set('otherBusinessType', parsed.otherBusinessType);
      else if (field === 'farmingCategory' && parsed.farmingCategory) set('farmingCategory', parsed.farmingCategory);
      else {
        set(field, text);
      }
    };
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!data.fullName.trim()) e.fullName = 'Please enter your full name';
    if (!data.state.trim()) e.state = 'Please select your state';
    if (!data.district.trim()) e.district = 'Please enter your district';
    if (!data.tehsil.trim()) e.tehsil = 'Please enter your tehsil/sub-district';
    if (!data.village.trim()) e.village = 'Please enter your village';
    if (!data.totalLandArea || Number(data.totalLandArea) <= 0) e.totalLandArea = 'Enter a valid land area';
    if (!data.farmingCategory) e.farmingCategory = 'Please select a farming category';
    if (!data.annualIncomeRange) e.annualIncomeRange = 'Please choose an income range';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Trust explanation */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-emerald-800 mb-1">यह आपकी AgroudAn Kisan Card है</p>
        <p className="text-xs text-slate-600">
          यह जानकारी आपकी AgroudAn Kisan Card प्रोफ़ाइल बनाने और आपके लिए उपयुक्त कृषि एवं सरकारी योजनाएँ दिखाने के लिए उपयोग की जाएगी।
          This is an AgroudAn application identity — not a government ID, and it never asks for Aadhaar, bank details, or OTPs as profile data.
        </p>
      </div>

      {/* Identity */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FaUser size={12} /> Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.fullName}
                onChange={(e) => { set('fullName', e.target.value); delete errors.fullName; }}
                placeholder="अपना नाम बोलें या लिखें"
                className={`flex-1 h-10 px-3 rounded-lg border ${errors.fullName ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm`}
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('fullName')} />
            </div>
            {errors.fullName && <p className="text-[10px] text-red-500 mt-0.5">{errors.fullName}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Father / Guardian Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.fatherName}
                onChange={(e) => set('fatherName', e.target.value)}
                placeholder="पिता का नाम"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm"
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('fatherName')} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
            <select
              value={data.gender}
              onChange={(e) => set('gender', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
            >
              <option value="">Prefer not to say</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Age / DOB</label>
            <input
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={data.mobileNumber}
                onChange={(e) => set('mobileNumber', e.target.value)}
                placeholder="10 digit"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('mobileNumber')} />
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FaMapMarkerAlt size={12} /> Location</h3>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1.5 transition disabled:opacity-60"
          >
            {locating ? <FaSpinner className="animate-spin" size={11} /> : <FaCrosshairs size={11} />}
            {locating ? 'Detecting…' : 'Auto-detect via GPS'}
          </button>
          {locError && (
            <FaInfoCircle className="text-amber-500" size={12} title={locError} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
            <div className="flex gap-2">
              <input
                list="kisan-states"
                value={data.state}
                onChange={(e) => { set('state', e.target.value); delete errors.state; }}
                placeholder="राज्य बोलें या लिखें"
                className={`flex-1 h-10 px-3 rounded-lg border ${errors.state ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-400 text-sm`}
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('state')} />
            </div>
            <datalist id="kisan-states">
              {INDIAN_STATES.map((s) => <option key={s} value={s} />)}
            </datalist>
            {errors.state && <p className="text-[10px] text-red-500 mt-0.5">{errors.state}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">District *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.district}
                onChange={(e) => { set('district', e.target.value); delete errors.district; }}
                placeholder="जिला"
                className={`flex-1 h-10 px-3 rounded-lg border ${errors.district ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-400 text-sm`}
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('district')} />
            </div>
            {errors.district && <p className="text-[10px] text-red-500 mt-0.5">{errors.district}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tehsil / Sub-district *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.tehsil}
                onChange={(e) => { set('tehsil', e.target.value); delete errors.tehsil; }}
                placeholder="तहसील"
                className={`flex-1 h-10 px-3 rounded-lg border ${errors.tehsil ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-400 text-sm`}
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('tehsil')} />
            </div>
            {errors.tehsil && <p className="text-[10px] text-red-500 mt-0.5">{errors.tehsil}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Village / Town *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.village}
                onChange={(e) => { set('village', e.target.value); delete errors.village; }}
                placeholder="गांव"
                className={`flex-1 h-10 px-3 rounded-lg border ${errors.village ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-400 text-sm`}
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('village')} />
            </div>
            {errors.village && <p className="text-[10px] text-red-500 mt-0.5">{errors.village}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.pincode}
                onChange={(e) => set('pincode', e.target.value)}
                placeholder="6 अंकों का पिनकोड"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('pincode')} />
            </div>
          </div>
        </div>
      </div>

      {/* Agriculture & Income */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FaSeedling size={12} /> Farming & Income Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Land Area *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={data.totalLandArea}
                  onChange={(e) => { set('totalLandArea', e.target.value); delete errors.totalLandArea; }}
                  placeholder="जमीन (जैसे 10)"
                  className={`flex-1 h-10 px-3 rounded-lg border ${errors.totalLandArea ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-400 text-sm`}
                />
                <VoiceFieldInput onTranscript={handleVoiceInput('totalLandArea')} />
              </div>
              {errors.totalLandArea && <p className="text-[10px] text-red-500 mt-0.5">{errors.totalLandArea}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
            <select
              value={data.landUnit}
              onChange={(e) => set('landUnit', e.target.value as any)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
            >
              {FARMLAND_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Farming Category *</label>
            <select
              value={data.farmingCategory}
              onChange={(e) => { set('farmingCategory', e.target.value); delete errors.farmingCategory; }}
              className={`w-full h-10 px-3 rounded-lg border ${errors.farmingCategory ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-400 text-sm`}
            >
              <option value="">Select category</option>
              <option>Crop Farming</option>
              <option>Plantation</option>
              <option>Mixed Farming</option>
              <option>Dairy</option>
              <option>Horticulture</option>
              <option>Hydroponics</option>
              <option>Other</option>
            </select>
            {errors.farmingCategory && <p className="text-[10px] text-red-500 mt-0.5">{errors.farmingCategory}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Annual Income Range (₹)</label>
            <select
              value={data.annualIncomeRange}
              onChange={(e) => { set('annualIncomeRange', e.target.value); delete errors.annualIncomeRange; }}
              className={`w-full h-10 px-3 rounded-lg border ${errors.annualIncomeRange ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-emerald-400 text-sm`}
            >
              <option value="">Select income range</option>
              {INCOME_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.annualIncomeRange && <p className="text-[10px] text-red-500 mt-0.5">{errors.annualIncomeRange}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Personal Annual Income (₹)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={data.personalIncome}
                onChange={(e) => set('personalIncome', e.target.value)}
                placeholder="अपनी सालाना आय"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('personalIncome')} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Family Annual Income (₹)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={data.familyIncome}
                onChange={(e) => set('familyIncome', e.target.value)}
                placeholder="परिवार की सालाना आय"
                className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
              />
              <VoiceFieldInput onTranscript={handleVoiceInput('familyIncome')} />
            </div>
          </div>
        </div>
      </div>

      {/* Other Business / Livelihood */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FaMoneyBillWave size={12} /> Other Business / Livelihood</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Do you have any other agriculture-related business?</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => set('hasOtherBusiness', true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                data.hasOtherBusiness ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-gray-300 hover:bg-emerald-50'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => { set('hasOtherBusiness', false); set('otherBusinessType', ''); set('otherBusinessDetails', ''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                !data.hasOtherBusiness ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-gray-300 hover:bg-emerald-50'
              }`}
            >
              No
            </button>
          </div>
        </div>

        {data.hasOtherBusiness && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Type</label>
              <div className="flex gap-2">
                <select
                  value={data.otherBusinessType}
                  onChange={(e) => set('otherBusinessType', e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
                >
                  <option value="">Select business type</option>
                  {OTHER_BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <VoiceFieldInput onTranscript={handleVoiceInput('otherBusinessType')} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business Details</label>
              <div className="flex gap-2">
                <textarea
                  value={data.otherBusinessDetails}
                  onChange={(e) => set('otherBusinessDetails', e.target.value)}
                  placeholder="व्यवसाय का विवरण बोलें या लिखें"
                  rows={2}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 text-sm"
                />
                <VoiceFieldInput onTranscript={handleVoiceInput('otherBusinessDetails')} />
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 text-white font-semibold text-sm shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 hover:-translate-y-0.5"
      >
        {loading ? 'Creating your Kisan Card…' : 'Create My AgroudAn Kisan Card'}
      </button>
    </form>
  );
}
