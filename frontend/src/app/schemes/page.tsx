'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { fetchPublishedSchemes, fetchSchemeEligibility, GovtScheme, SchemeType, SchemeEligibility } from '@/services/schemes';
import { getKisanCardStatus, CardStatusResponse } from '@/services/kisanCard';
import { usePageContext } from '@/hooks/usePageContext';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';
import { useAuth } from '@/context/AuthContext';

const INDIAN_STATES = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
    'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
    'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
    'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
    'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
    'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const formatDate = (value?: string) => {
    if (!value) return 'Recently published';
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

const STATUS_LABELS: Record<SchemeEligibility['status'], { text: string; color: string }> = {
    eligible: { text: 'आपके लिए पात्र', color: 'bg-emerald-500/15 text-emerald-300' },
    'not-eligible': { text: 'पात्र नहीं', color: 'bg-red-500/15 text-red-300' },
    'information-required': { text: 'पात्रता जांचें', color: 'bg-amber-500/15 text-amber-300' },
    unknown: { text: 'अज्ञात', color: 'bg-slate-500/15 text-slate-300' },
};

function EligibilityBadge({ eligibility }: { eligibility?: SchemeEligibility }) {
    if (!eligibility) return null;
    const cfg = STATUS_LABELS[eligibility.status];
    return (
        <div className="mt-3 rounded-xl border border-white/5 bg-white/3 px-3 py-2">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.color}`}>{cfg.text}</span>
            {eligibility.reasons.length > 0 && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                    {eligibility.reasons[0]}
                </p>
            )}
        </div>
    );
}

export default function SchemesPage() {
    const router = useRouter();
    const [schemes, setSchemes] = useState<GovtScheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [activeType, setActiveType] = useState<'' | SchemeType>('');
    const [selectedState, setSelectedState] = useState('');
    const [showAllSchemes, setShowAllSchemes] = useState(false);

    const { isAuthenticated, isLoading: sessionLoading } = useAuth();
    const [eligibilityMap, setEligibilityMap] = useState<Record<string, SchemeEligibility>>({});
    const [cardSummary, setCardSummary] = useState<{ cardNumber: string; cardStatus: string; state: string; district: string } | null>(null);
    const [eligLoaded, setEligLoaded] = useState(false);
    const [cardStatus, setCardStatus] = useState<CardStatusResponse | null>(null);
    const [cardCheckLoading, setCardCheckLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            setCardCheckLoading(false);
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const status = await getKisanCardStatus();
                if (!cancelled) setCardStatus(status);
            } catch {
                /* non-critical */
            } finally {
                if (!cancelled) setCardCheckLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || !cardStatus?.hasCard) {
            setEligLoaded(true);
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const res = await fetchSchemeEligibility();
                if (cancelled || !res) return;
                setEligibilityMap(res.eligibility || {});
                setCardSummary(res.cardSummary);
            } catch {
            } finally {
                if (!cancelled) setEligLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [isAuthenticated, cardStatus?.hasCard]);

    const mergedSchemes = schemes.map((s) => ({ ...s, cardEligibility: eligibilityMap[s._id] }));

    const eligibleSchemes = mergedSchemes
        .filter((s) => s.cardEligibility && s.cardEligibility.status === 'eligible')
        .sort((a, b) => (b.cardEligibility?.confidence ?? 0) - (a.cardEligibility?.confidence ?? 0));

    usePageContext({ pageContext: 'government' });
    useVoiceGuide('government_scheme');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchPublishedSchemes({
                search: debouncedSearch || undefined,
                schemeType: activeType || undefined,
                state: activeType === 'state' ? selectedState || undefined : undefined,
            });
            setSchemes(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load schemes');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, activeType, selectedState]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => { if (activeType !== 'state') setSelectedState(''); }, [activeType]);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

    const displaySchemes = showAllSchemes ? mergedSchemes : eligibleSchemes;

    return (
        <main className="min-h-screen bg-gradient-to-b from-lime-50 via-white to-amber-50">
            <Navbar />

            <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.22),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(245,158,11,0.2),transparent_40%)] py-14">
                <div className="section-container">
                    <span className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-green-700">Government Schemes</span>
                    <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight text-gray-900 md:text-5xl">आपके लिए योजनाएँ</h1>
                    <p className="mt-4 max-w-2xl text-base text-gray-700">आपकी किसान कार्ड और प्रोफाइल के आधार पर पात्र योजनाएँ देखें।</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link href="/schemes/seva-mitra" className="inline-flex items-center gap-2 rounded-2xl bg-green-700 text-white font-bold px-6 py-3.5 shadow-md shadow-green-200 hover:bg-green-800 transition">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-500"></span>
                            </span>
                            Try Rajasthan AI Seva Mitra (वॉयस असिस्टेंट)
                        </Link>
                    </div>
                </div>
            </section>

            <section className="section-container pt-8 pb-4">
                <div className="flex flex-wrap gap-2 mb-5">
                    {([['', 'All Schemes'], ['central', 'Central Government'], ['state', 'State Government']] as ['' | SchemeType, string][]).map(([type, label]) => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${activeType === type ? 'bg-green-700 text-white shadow-md' : 'bg-white border border-green-200 text-green-800 hover:bg-green-50'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by scheme name, state, keyword..."
                            className="w-full rounded-xl border border-green-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                        )}
                    </div>

                    {activeType === 'state' && (
                        <select
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            className="rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-green-500 focus:outline-none"
                        >
                            <option value="">All States</option>
                            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                </div>
            </section>

            {!showAllSchemes && (
                <section className="section-container py-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">आपके लिए उपलब्ध योजनाएँ</h2>
                        {cardSummary && (
                            <span className="text-xs text-gray-500">
                                किसान कार्ड: {cardSummary.cardNumber?.slice(-4) ? `XXXX-${cardSummary.cardNumber.slice(-4)}` : 'Active'}
                            </span>
                        )}
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>
                    )}

                    {!loading && !error && eligibleSchemes.length === 0 && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                            {!cardStatus?.hasCard ? (
                                <>
                                    <p className="text-lg font-semibold text-amber-800 mb-2">आपका AgroudAn Kisan Card अभी नहीं बना है।</p>
                                    <p className="text-sm text-amber-600 mb-4">सरकारी योजनाओं की पात्रता जानने के लिए किसान कार्ड आवश्यक है।</p>
                                    <button
                                        onClick={() => router.push('/dashboard/farmer/profile')}
                                        className="inline-flex items-center gap-2 rounded-xl bg-green-700 text-white font-bold px-6 py-3 shadow-md hover:bg-green-800 transition"
                                    >
                                        AgroudAn Kisan Card बनाएं
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg font-semibold text-amber-800 mb-2">अभी आपके लिए कोई पात्र योजना नहीं मिली।</p>
                                    <p className="text-sm text-amber-600">अधिक जानकारी के लिए अपनी प्रोफाइल अपडेट करें या सभी योजनाएँ देखें।</p>
                                </>
                            )}
                        </div>
                    )}

                    {!loading && !error && eligibleSchemes.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {eligibleSchemes.map((scheme) => (
                                <article key={scheme._id} className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm flex flex-col">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-bold text-gray-900 line-clamp-1">{scheme.title}</h3>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${scheme.schemeType === 'central' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'}`}>
                                            {scheme.schemeType === 'central' ? 'Central' : 'State'}
                                        </span>
                                    </div>
                                    {scheme.state && <span className="text-xs text-gray-500">{scheme.state}</span>}
                                    <p className="mt-1 line-clamp-2 text-sm text-gray-600 flex-1">{scheme.summary}</p>
                                    <div className="mt-2 text-xs text-emerald-600 font-medium">✓ आप इस योजना के लिए पात्र हैं</div>
                                    <EligibilityBadge eligibility={scheme.cardEligibility} />
                                    <Link href={`/schemes/${scheme.slug}`} className="mt-3 inline-flex rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700">
                                        View Details
                                    </Link>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {showAllSchemes && (
                <section className="section-container py-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">सभी योजनाएँ</h2>
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
                        </div>
                    )}

                    {!loading && !error && mergedSchemes.length === 0 && (
                        <div className="rounded-2xl border border-green-200 bg-white p-10 text-center text-gray-600 shadow-sm">
                            <p className="text-lg font-semibold mb-2">No schemes found</p>
                            <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
                        </div>
                    )}

                    {!loading && mergedSchemes.length > 0 && (
                        <>
                            <p className="mb-4 text-sm text-gray-500">{mergedSchemes.length} schemes found</p>
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {mergedSchemes.map((scheme) => (
                                    <article key={scheme._id} className="group overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col">
                                        <div className="relative h-44 bg-gradient-to-br from-lime-200 via-emerald-100 to-amber-100 overflow-hidden flex-shrink-0">
                                            {scheme.coverImage || scheme.images?.[0] ? (
                                                <img
                                                    src={(scheme.coverImage || scheme.images[0]).startsWith('/') ? `${API_BASE}${scheme.coverImage || scheme.images[0]}` : (scheme.coverImage || scheme.images[0])}
                                                    alt={scheme.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center px-6 text-center text-lg font-bold text-green-800">{scheme.title}</div>
                                            )}
                                            <div className="absolute top-3 left-3 flex gap-1.5">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${scheme.schemeType === 'central' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'}`}>
                                                    {scheme.schemeType === 'central' ? 'Central' : 'State'}
                                                </span>
                                                {scheme.state && <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-700">{scheme.state}</span>}
                                            </div>
                                        </div>

                                        <div className="flex flex-col flex-1 p-5">
                                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-700">{formatDate(scheme.publishedAt || scheme.createdAt)}</p>
                                            <h2 className="mt-2 text-lg font-bold leading-snug text-gray-900 line-clamp-2">{scheme.title}</h2>
                                            <p className="mt-1 text-sm font-medium text-emerald-700">{scheme.department}</p>
                                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600 flex-1">{scheme.summary}</p>

                                            {scheme.benefits?.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {scheme.benefits.slice(0, 3).map((b) => (
                                                        <span key={b} className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">{b}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {scheme.cardEligibility && <EligibilityBadge eligibility={scheme.cardEligibility} />}

                                            <Link href={`/schemes/${scheme.slug}`} className="mt-4 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 self-start">
                                                View Details
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            )}

            <section className="section-container py-4 text-center">
                <button
                    onClick={() => setShowAllSchemes(!showAllSchemes)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-green-700 text-white font-bold px-6 py-3 shadow-md shadow-green-200 hover:bg-green-800 transition"
                >
                    {showAllSchemes ? 'आपके लिए योजनाएँ देखें' : 'सभी योजनाएँ देखें'}
                </button>
            </section>

            <Footer />
        </main>
    );
}
