const API_ROOT = process.env.NEXT_PUBLIC_API_URL || '/api';

export type SchemeType = 'central' | 'state';

export type GovtScheme = {
    _id: string;
    title: string;
    slug: string;
    summary: string;
    description: string;
    department: string;
    audience: string;
    benefits: string[];
    eligibility?: string;
    requiredDocuments?: string[];
    applicationProcess?: string;
    applicationLink?: string;
    officialLink?: string;
    coverImage?: string;
    images: string[];
    videos: string[];
    tags: string[];
    keywords: string[];
    schemeType: SchemeType;
    state?: string;
    cardEligibility?: SchemeEligibility;
    status: 'draft' | 'published';
    source: 'admin' | 'api';
    publishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

type SchemesResponse = { success: boolean; data: GovtScheme[]; total: number; pages: number; page: number };

async function parseJson(response: Response) {
    try { return await response.json(); } catch { return null; }
}

export async function fetchPublishedSchemes(params: {
    search?: string;
    schemeType?: SchemeType;
    state?: string;
} = {}): Promise<GovtScheme[]> {
    const qs = new URLSearchParams({ status: 'published', limit: '100' });
    if (params.search?.trim()) qs.set('search', params.search.trim());
    if (params.schemeType) qs.set('schemeType', params.schemeType);
    if (params.state && params.schemeType === 'state') qs.set('state', params.state);

    const response = await fetch(`${API_ROOT}/schemes?${qs.toString()}`, { cache: 'no-store' });
    const payload = await parseJson(response) as SchemesResponse | null;
    if (!response.ok) throw new Error((payload as any)?.error || 'Failed to fetch government schemes');
    return payload?.data || [];
}

export async function fetchSchemeBySlug(slug: string): Promise<GovtScheme> {
    const response = await fetch(`${API_ROOT}/schemes/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    const payload = await parseJson(response);
    if (!response.ok) throw new Error(payload?.error || 'Failed to fetch scheme details');
    return payload?.data as GovtScheme;
}

// ─── Phase 4: per-scheme eligibility derived from the farmer's own Kisan Card ───

export type SchemeEligibilityStatus = 'eligible' | 'not-eligible' | 'information-required' | 'unknown';

export interface SchemeEligibility {
    status: SchemeEligibilityStatus;
    eligible: boolean;
    reasons: string[];
    missingFields: string[];
    confidence: number;
}

export interface KisanCardEligibilityResponse {
    success: boolean;
    hasCard: boolean;
    cardSummary: { cardNumber: string; cardStatus: string; state: string; district: string } | null;
    updatedAt?: string;
    eligibility: Record<string, SchemeEligibility>;
}

export const fetchSchemeEligibility = async (): Promise<KisanCardEligibilityResponse | null> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) return null;

    const response = await fetch(`${API_ROOT}/schemes/my-eligibility`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) return null; // not logged in -> treat as no personalization
    const payload = await parseJson(response);
    if (!response.ok) throw new Error(payload?.error || 'Failed to fetch scheme eligibility');
    return payload as KisanCardEligibilityResponse | null;
};
