'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaIdCard, FaSearch, FaSyncAlt, FaUserCheck, FaLeaf, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useAdmin } from '@/components/admin/AdminProvider';
import { StatCard } from '@/components/admin/AdminUi';
import { fetchAdminKisanCards, formatDate } from '@/components/admin/admin-api';
import type { AdminKisanCard, KisanCardsResponse } from '@/components/admin/admin-types';

const PAGE_SIZE = 20;

function DetailModal({ card, onClose }: { card: AdminKisanCard; onClose: () => void }) {
    const ag = card.agriculture || {} as any;
    const loc = card.location || {} as any;
    const rows: [string, string][] = [
        ['Card Number', card.cardNumber],
        ['Farmer Name', card.fullName],
        ['Status', card.cardStatus],
        ['Complete', card.isComplete ? 'Yes' : 'No'],
        ['State', loc.state || '—'],
        ['District', loc.district || '—'],
        ['Tehsil', loc.tehsil || '—'],
        ['Village', loc.village || '—'],
        ['Land Area', ag.totalLandArea ? `${ag.totalLandArea} ${ag.landUnit || ''}` : '—'],
        ['Main Crops', ag.mainCrops?.join(', ') || '—'],
        ['Registration Date', formatDate(card.createdAt)],
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Kisan Card Details</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
                        ×
                    </button>
                </div>
                <div className="space-y-2 text-sm">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex gap-2 border-b border-white/5 pb-2">
                            <span className="w-40 shrink-0 text-slate-400">{label}</span>
                            <span className="text-white break-all">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function AdminKisanCardsPage() {
    const { token, pendingAction } = useAdmin();

    const [cards, setCards] = useState<AdminKisanCard[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [pagination, setPagination] = useState<KisanCardsResponse['pagination'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [page, setPage] = useState(1);

    const [detailCard, setDetailCard] = useState<AdminKisanCard | null>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const loadCards = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetchAdminKisanCards(token, {
                page,
                limit: PAGE_SIZE,
                search: debouncedSearch || undefined,
                state: stateFilter || undefined,
            });
            setCards(res.data);
            setPagination(res.pagination);
            setTotal(res.pagination.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load Kisan Cards');
        } finally {
            setLoading(false);
        }
    }, [token, page, debouncedSearch, stateFilter]);

    useEffect(() => { void loadCards(); }, [loadCards]);
    useEffect(() => { setPage(1); }, [stateFilter]);

    return (
        <div className="space-y-6">
            <StatCard title="Registered Kisan Cards" value={total} icon={FaIdCard} accent="from-green-500 to-emerald-500" />

            <section className="glass-panel rounded-3xl p-5 md:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-bold text-white">Registered AgroudAn Kisan Cards</h3>
                        <p className="mt-1 text-sm text-slate-400">
                            {pagination ? `${pagination.total} registered cards` : 'Live data from MongoDB'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadCards()}
                        className="admin-button-secondary text-xs"
                        disabled={loading}
                    >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input
                            type="text"
                            placeholder="Search card number, name, state, district…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="admin-input pl-8 py-2 text-sm w-full"
                        />
                    </div>
                    <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none"
                    >
                        <option value="">All States</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Bihar">Bihar</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                    </select>
                </div>

                {error && (
                    <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
                    </div>
                ) : cards.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">No Kisan Cards found.</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                                <thead className="text-slate-400">
                                    <tr>
                                        <th className="pb-4 pr-4 font-medium">Card Number</th>
                                        <th className="pb-4 pr-4 font-medium">Farmer Name</th>
                                        <th className="pb-4 pr-4 font-medium hidden md:table-cell">State</th>
                                        <th className="pb-4 pr-4 font-medium hidden md:table-cell">District</th>
                                        <th className="pb-4 pr-4 font-medium hidden lg:table-cell">Tehsil</th>
                                        <th className="pb-4 pr-4 font-medium hidden lg:table-cell">Village</th>
                                        <th className="pb-4 pr-4 font-medium hidden xl:table-cell">Land</th>
                                        <th className="pb-4 pr-4 font-medium hidden xl:table-cell">Main Crops</th>
                                        <th className="pb-4 pr-4 font-medium">Status</th>
                                        <th className="pb-4 pr-4 font-medium hidden xl:table-cell">Registered</th>
                                        <th className="pb-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {cards.map((card) => (
                                        <tr key={card._id} className="align-top text-slate-200">
                                            <td className="py-4 pr-4">
                                                <code className="rounded bg-slate-900/60 px-2 py-0.5 text-xs font-mono text-cyan-300">{card.cardNumber}</code>
                                            </td>
                                            <td className="py-4 pr-4 font-semibold text-white">{card.fullName}</td>
                                            <td className="py-4 pr-4 hidden md:table-cell">{card.location?.state || '—'}</td>
                                            <td className="py-4 pr-4 hidden md:table-cell">{card.location?.district || '—'}</td>
                                            <td className="py-4 pr-4 hidden lg:table-cell">{card.location?.tehsil || '—'}</td>
                                            <td className="py-4 pr-4 hidden lg:table-cell">{card.location?.village || '—'}</td>
                                            <td className="py-4 pr-4 hidden xl:table-cell">
                                                {card.agriculture?.totalLandArea ? `${card.agriculture.totalLandArea} ${card.agriculture.landUnit || ''}` : '—'}
                                            </td>
                                            <td className="py-4 pr-4 hidden xl:table-cell">{card.agriculture?.mainCrops?.join(', ') || '—'}</td>
                                            <td className="py-4 pr-4">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                        card.cardStatus === 'active'
                                                            ? 'bg-emerald-500/15 text-emerald-300'
                                                            : card.cardStatus === 'pending'
                                                            ? 'bg-amber-500/15 text-amber-300'
                                                            : 'bg-red-500/15 text-red-300'
                                                    }`}
                                                >
                                                    {card.cardStatus}
                                                </span>
                                                {card.isComplete ? (
                                                    <FaUserCheck className="ml-1 inline text-xs text-emerald-400" />
                                                ) : (
                                                    <FaLeaf className="ml-1 inline text-xs text-slate-500" />
                                                )}
                                            </td>
                                            <td className="py-4 pr-4 hidden xl:table-cell text-slate-300">{formatDate(card.createdAt)}</td>
                                            <td className="py-4">
                                                <button
                                                    type="button"
                                                    title="View Details"
                                                    className="admin-button-secondary text-xs px-2"
                                                    disabled={pendingAction === `card-${card._id}`}
                                                    onClick={() => setDetailCard(card)}
                                                >
                                                    <FaIdCard />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination && pagination.pages > 1 && (
                            <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
                                <p>
                                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of{' '}
                                    {pagination.total}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="admin-button-secondary text-xs px-3"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <FaChevronLeft />
                                    </button>
                                    <span className="px-2 py-1 text-white">{page} / {pagination.pages}</span>
                                    <button
                                        type="button"
                                        className="admin-button-secondary text-xs px-3"
                                        onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                                        disabled={page === pagination.pages}
                                    >
                                        <FaChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {detailCard && <DetailModal card={detailCard} onClose={() => setDetailCard(null)} />}
        </div>
    );
}
