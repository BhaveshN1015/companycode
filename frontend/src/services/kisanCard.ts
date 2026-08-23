function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export interface CardLocation {
  country?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  pincode?: string;
  coordinates?: { latitude: number; longitude: number };
}

export interface CardAgriculture {
  totalLandArea?: number;
  landUnit?: 'acres' | 'hectares' | 'bigha';
  farmingCategory?: string;
  annualIncomeRange?: string;
}

export interface CardOtherBusiness {
  hasOtherBusiness?: boolean;
  businessType?: string;
  businessDetails?: string;
}

export interface KisanCard {
  _id: string;
  userId: string;
  cardNumber: string;
  cardStatus: 'active' | 'pending' | 'suspended';
  fullName: string;
  fatherName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobileNumber?: string;
  personalIncome?: number;
  familyIncome?: number;
  location: {
    country: string;
    state: string;
    district: string;
    tehsil: string;
    village: string;
    pincode: string;
    coordinates: { latitude: number; longitude: number };
  };
  agriculture: {
    totalLandArea: number;
    landUnit: 'acres' | 'hectares' | 'bigha';
    farmingCategory: string;
    annualIncomeRange: string;
  };
  otherBusiness: {
    hasOtherBusiness: boolean;
    businessType: string;
    businessDetails: string;
  };
  isComplete: boolean;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardStatusResponse {
  hasCard: boolean;
  cardNumber: string | null;
  cardStatus: string | null;
  isComplete: boolean;
}

export interface CreateCardPayload {
  fullName: string;
  fatherName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobileNumber?: string;
  personalIncome?: number;
  familyIncome?: number;
  location?: CardLocation;
  agriculture?: CardAgriculture;
  otherBusiness?: CardOtherBusiness;
}

export async function getKisanCardStatus(): Promise<CardStatusResponse> {
  const res = await fetch('/api/kisan-card/status', { headers: authHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to check Kisan Card status');
  return json.data;
}

export async function getKisanCard(): Promise<KisanCard> {
  const res = await fetch('/api/kisan-card', { headers: authHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load Kisan Card');
  return json.data;
}

export async function createKisanCard(payload: CreateCardPayload): Promise<{ card: KisanCard; alreadyExisted: boolean }> {
  const res = await fetch('/api/kisan-card', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to create Kisan Card');
  return { card: json.data, alreadyExisted: json.alreadyExisted === true };
}

export async function updateKisanCard(payload: Partial<CreateCardPayload>): Promise<KisanCard> {
  const res = await fetch('/api/kisan-card', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to update Kisan Card');
  return json.data;
}
