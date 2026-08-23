'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FaUsers, FaUserShield, FaCheckCircle, FaToggleOn, FaToggleOff,
  FaSearch, FaEye, FaTrash, FaUserCheck, FaUserTimes, FaTimes,
  FaSyncAlt, FaChevronLeft, FaChevronRight, FaSeedling, FaIdCard,
  FaEdit, FaSave, FaSpinner,
} from 'react-icons/fa';
import { useAdmin } from '@/components/admin/AdminProvider';
import { StatCard } from '@/components/admin/AdminUi';
import { fetchAdminUsers, fetchAdminUserCard, updateAdminUserCard, formatDate, type AdminCardUpdatePayload } from '@/components/admin/admin-api';
import type { AdminUser, UserSummary, UserPagination, AdminFarmerCardDetail } from '@/components/admin/admin-types';

const PAGE_SIZE = 20;

const CARD_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
};

function CardBadge({ cardNumber, status }: { cardNumber: string | null; status: string | null }) {
  if (!cardNumber) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400">
        <FaIdCard className="text-slate-500" /> Not Registered
      </span>
    );
  }
  const StatusDot = (status || 'active') === 'active' ? 'bg-emerald-400' : status === 'suspended' ? 'bg-red-400' : 'bg-amber-400';
  return (
    <span
      className="inline-flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-gradient-to-br from-emerald-950/60 via-emerald-900/60 to-transparent px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-emerald-300"
      title={`AGROUDAN KISAN CARD · ${cardNumber} · ${CARD_STATUS_LABEL[status || 'active']}`}
    >
      AGROUDAN KISAN CARD
      <span className="mx-1 h-3.5 w-px bg-white/20" />
      <span className="font-bold tracking-widest text-emerald-200">{cardNumber}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${StatusDot}`} />
    </span>
  );
}

function FarmerDetailsModal({
  user,
  token,
  onClose,
  onUpdated,
}: {
  user: AdminUser;
  token: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [card, setCard] = useState<AdminFarmerCardDetail | null>(null);
  const [cardLoading, setCardLoading] = useState(user.kisanCardNumber ? true : false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadCard = useCallback(async () => {
    if (user.role !== 'farmer' || !user.kisanCardNumber) {
      setCard(null);
      setCardLoading(false);
      return;
    }
    setCardLoading(true);
    try {
      const res = await fetchAdminUserCard(token, user._id);
      setCard(res.data);
    } catch (err) {
      setCard(null);
    } finally {
      setCardLoading(false);
    }
  }, [token, user]);

  useEffect(() => { void loadCard(); }, [loadCard]);

  const [form, setForm] = useState<AdminCardUpdatePayload>({});

  useEffect(() => {
    if (card) {
      setForm({
        fullName: card.fullName,
        fatherName: card.fatherName,
        gender: card.gender,
        dateOfBirth: card.dateOfBirth,
        location: {
          country: card.location.country,
          state: card.location.state,
          district: card.location.district,
          tehsil: card.location.tehsil,
          village: card.location.village,
          pincode: card.location.pincode,
          coordinates: card.location.coordinates,
        },
        agriculture: {
          totalLandArea: card.agriculture.totalLandArea,
          landUnit: card.agriculture.landUnit,
          farmingCategory: card.agriculture.farmingCategory,
          mainCrops: card.agriculture.mainCrops,
          annualIncomeRange: card.agriculture.annualIncomeRange,
        },
        cardStatus: card.cardStatus,
      });
      setSaveError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card]);

  const onSave = async () => {
    if (!card) return;
    setSaving(true);
    setSaveError('');
    try {
      await updateAdminUserCard(token, user._id, form);
      await loadCard();
      setEditing(false);
      onUpdated();
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/60";
  const labelCls = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1";

  let body: ReactNode;
  if (user.kisanCardNumber) {
    if (cardLoading) {
      body = (
        <div className="flex items-center gap-3 text-slate-400">
          <FaSpinner className="animate-spin" /> Loading card details…
        </div>
      );
    } else if (!card) {
      body = <p className="text-sm text-slate-400">Could not load card details.</p>;
    } else if (editing) {
      body = (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Card Number (read-only)</label>
            <input value={card.cardNumber} readOnly className={`${inputCls} font-mono text-emerald-300`} />
          </div>
          <div>
            <label className={labelCls}>Farmer Name</label>
            <input value={form.fullName ?? ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Father / Guardian Name</label>
            <input value={form.fatherName ?? ''} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <input value={form.gender ?? ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date of Birth</label>
            <input type="date" value={form.dateOfBirth ?? ''} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Location</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {( ['state','district','tehsil','village','pincode'] as const).map((f) => (
                <div key={f}>
                  <label className="block text-[10px] text-slate-500 mb-1 capitalize">{f}</label>
                  <input
                    value={(form.location as any)?.[f] ?? ''}
                    onChange={(e) => setForm({
                      ...form,
                      location: { ...(form.location as any), [f]: e.target.value },
                    })}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Land Area</label>
            <input type="number" value={form.agriculture?.totalLandArea ?? 0} onChange={(e) => setForm({ ...form, agriculture: { ...(form.agriculture as any), totalLandArea: Number(e.target.value) } })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Land Unit</label>
            <select value={form.agriculture?.landUnit ?? 'acres'} onChange={(e) => setForm({ ...form, agriculture: { ...(form.agriculture as any), landUnit: e.target.value } })} className={inputCls}>
              <option value="acres">Acres</option>
              <option value="hectares">Hectares</option>
              <option value="bigha">Bigha</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Farming Category</label>
            <input value={form.agriculture?.farmingCategory ?? ''} onChange={(e) => setForm({ ...form, agriculture: { ...(form.agriculture as any), farmingCategory: e.target.value } })} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Main Crops (comma separated)</label>
            <input
              value={(form.agriculture?.mainCrops ?? []).join(', ')}
              onChange={(e) => setForm({ ...form, agriculture: { ...(form.agriculture as any), mainCrops: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Annual Income Range</label>
            <input value={form.agriculture?.annualIncomeRange ?? ''} onChange={(e) => setForm({ ...form, agriculture: { ...(form.agriculture as any), annualIncomeRange: e.target.value } })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Card Status</label>
            <select
              value={form.cardStatus ?? 'active'}
              onChange={(e) => setForm({ ...form, cardStatus: e.target.value as 'active' | 'pending' | 'suspended' })}
              className={inputCls}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          {saveError && <p className="sm:col-span-2 text-xs text-red-400">{saveError}</p>}
        </div>
      );
    } else {
      const rows: [string, string | null | undefined][] = [
        ['AgroudAn Kisan Card', card.cardNumber],
        ['Card Status', CARD_STATUS_LABEL[card.cardStatus || 'active']],
        ['Card Complete', card.isComplete ? 'Yes' : 'No'],
        ['Farmer Name', card.fullName],
        ['Father / Guardian Name', card.fatherName || null],
        ['Mobile Number', user.phone || null],
        ['Gender', card.gender || null],
        ['Date of Birth', card.dateOfBirth ? formatDate(card.dateOfBirth) : null],
        ['Registration Date', user.createdAt ? formatDate(user.createdAt) : null],
        ['Card Issued At', card.issuedAt ? formatDate(card.issuedAt) : null],
        ['State', card.location.state || null],
        ['District', card.location.district || null],
        ['Village', card.location.village || null],
        ['Tehsil', card.location.tehsil || null],
        ['Pincode', card.location.pincode || null],
        ['Land Area', card.agriculture.totalLandArea ? `${card.agriculture.totalLandArea} ${card.agriculture.landUnit}` : null],
        ['Farming Category', card.agriculture.farmingCategory || null],
        ['Main Crops', card.agriculture.mainCrops?.length ? card.agriculture.mainCrops.join(', ') : null],
        ['Annual Income Range', card.agriculture.annualIncomeRange || null],
      ];
      body = (
        <div className="space-y-3.5 text-sm">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">AGROUDAN KISAN CARD</span>
            <span className="font-mono text-lg font-extrabold text-emerald-200">{card.cardNumber}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.cardStatus === 'suspended' ? 'bg-red-500/15 text-red-300' : card.cardStatus === 'pending' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
              {CARD_STATUS_LABEL[card.cardStatus || 'active']}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/5 bg-white/2 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                <div className="mt-0.5 text-sm text-white break-all">{value ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  } else {
    body = (
      <div className="space-y-2 text-sm text-slate-300">
        <p>This farmer does not have a registered AgroudAn Kisan Card.</p>
        <p className="text-xs text-slate-500">Card details and editing are unavailable until a card is issued.</p>
      </div>
    );
  }

  const canEdit = !!card && !cardLoading;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Farmer Details</h3>
            <p className="text-sm text-slate-400">{user.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                type="button"
                title="Edit Farmer Details"
                className="admin-button-secondary text-xs"
                onClick={() => setEditing(true)}
              >
                <FaEdit /> Edit Farmer Details
              </button>
            )}
            {canEdit && editing && (
              <>
                <button
                  type="button"
                  title="Cancel"
                  className="admin-button-secondary text-xs"
                  onClick={() => { setEditing(false); setSaveError(''); }}
                >
                  <FaTimes />
                </button>
                <button
                  type="button"
                  title="Save"
                  className="admin-button-primary text-xs"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Save
                </button>
              </>
            )}
            <button type="button" title="Close" className="text-slate-400 hover:text-white" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>
        {body}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { token, pendingAction, updateUserRole, toggleVerification, disableUser, deleteUser, userSummary: ctxSummary } = useAdmin();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<UserSummary | null>(ctxSummary);
  const [pagination, setPagination] = useState<UserPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [cardFilter, setCardFilter] = useState('');
  const [page, setPage] = useState(1);

  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdminUsers(token, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
        verified: verifiedFilter || undefined,
        card: cardFilter || undefined,
      });
      setUsers(res.data);
      setPagination(res.pagination);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, roleFilter, verifiedFilter, cardFilter]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [roleFilter, verifiedFilter, cardFilter]);

  const handleAction = async (action: () => Promise<void>) => {
    await action();
    void loadUsers();
  };

  const summaryCards = useMemo(() => [
    { title: 'Total Users', value: summary?.total ?? 0, icon: FaUsers, accent: 'from-cyan-500 to-blue-500' },
    { title: 'Farmers', value: summary?.farmers ?? 0, icon: FaSeedling, accent: 'from-emerald-500 to-teal-500' },
    { title: 'Admins', value: summary?.admins ?? 0, icon: FaUserShield, accent: 'from-fuchsia-500 to-pink-500' },
    { title: 'Verified', value: summary?.verified ?? 0, icon: FaCheckCircle, accent: 'from-amber-400 to-orange-500' },
    { title: 'Active Users', value: summary?.active ?? 0, icon: FaToggleOn, accent: 'from-indigo-500 to-violet-500' },
    { title: 'AgroudAn Kisan Cards', value: summary?.cards ?? 0, icon: FaIdCard, accent: 'from-emerald-600 to-lime-500' },
  ], [summary]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} accent={card.accent} />
        ))}
      </div>

      {/* Main Table Panel */}
      <section className="glass-panel rounded-3xl p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white">User Management</h3>
            <p className="mt-1 text-sm text-slate-400">
              {pagination ? `${pagination.total} registered users` : 'Live data from MongoDB'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="admin-button-secondary text-xs"
            disabled={loading}
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search & Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-52">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search name, email, mobile, card number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-input pl-8 py-2 text-sm w-full"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All Roles</option>
            <option value="farmer">Farmer</option>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All Verification</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>

          <select
            value={cardFilter}
            onChange={(e) => setCardFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All Cards</option>
            <option value="registered">Registered</option>
            <option value="not_registered">Not Registered</option>
          </select>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400">No users found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-4 pr-4 font-medium">Name</th>
                    <th className="pb-4 pr-4 font-medium">Email</th>
                    <th className="pb-4 pr-4 font-medium hidden sm:table-cell">Mobile</th>
                    <th className="pb-4 pr-4 font-medium hidden md:table-cell">AgroudAn Kisan Card</th>
                    <th className="pb-4 pr-4 font-medium">Role</th>
                    <th className="pb-4 pr-4 font-medium">Status</th>
                    <th className="pb-4 pr-4 font-medium hidden lg:table-cell">Verified</th>
                    <th className="pb-4 pr-4 font-medium hidden xl:table-cell">Registered</th>
                    <th className="pb-4 pr-4 font-medium hidden xl:table-cell">Last Login</th>
                    <th className="pb-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.map((user) => (
                    <tr key={user._id} className="align-top text-slate-200">
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-slate-400">Points: {user.points ?? 0}</p>
                      </td>
                      <td className="py-4 pr-4 text-slate-300 text-xs">{user.email}</td>
                      <td className="py-4 pr-4 text-slate-300 hidden sm:table-cell">{user.phone || '—'}</td>
                      <td className="py-4 pr-4 hidden md:table-cell">
                        <CardBadge cardNumber={user.kisanCardNumber ?? null} status={user.kisanCardStatus ?? null} />
                      </td>
                      <td className="py-4 pr-4">
                        <select
                          className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none"
                          aria-label={`Change role for ${user.name}`}
                          value={user.role}
                          onChange={(e) => handleAction(() => updateUserRole(user._id, e.target.value as AdminUser['role']))}
                          disabled={pendingAction === `role-${user._id}`}
                        >
                          <option value="farmer">Farmer</option>
                          <option value="vendor">Vendor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-4 pr-4 hidden lg:table-cell">
                        <button
                          type="button"
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${user.verified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-300'}`}
                          onClick={() => handleAction(() => toggleVerification(user._id, !user.verified))}
                          disabled={pendingAction === `verify-${user._id}`}
                        >
                          {user.verified ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="py-4 pr-4 text-slate-300 text-xs hidden xl:table-cell">{formatDate(user.createdAt)}</td>
                      <td className="py-4 pr-4 text-slate-300 text-xs hidden xl:table-cell">{formatDate(user.lastLogin)}</td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            title="View Details"
                            className="admin-button-secondary text-xs px-2"
                            onClick={() => setDetailUser(user)}
                          >
                            <FaEye />
                          </button>
                          <button
                            type="button"
                            title={user.verified ? 'Unverify' : 'Verify'}
                            className="admin-button-secondary text-xs px-2"
                            onClick={() => handleAction(() => toggleVerification(user._id, !user.verified))}
                            disabled={pendingAction === `verify-${user._id}`}
                          >
                            {user.verified ? <FaUserTimes /> : <FaUserCheck />}
                          </button>
                          <button
                            type="button"
                            title={user.isActive ? 'Disable User' : 'Enable User'}
                            className="admin-button-secondary text-xs px-2"
                            onClick={() => handleAction(() => disableUser(user._id, !user.isActive))}
                            disabled={pendingAction === `disable-${user._id}`}
                          >
                            {user.isActive ? <FaToggleOn className="text-emerald-400" /> : <FaToggleOff className="text-red-400" />}
                          </button>
                          <button
                            type="button"
                            title="Delete User"
                            className="admin-button-secondary text-xs px-2 hover:border-red-400/40 hover:text-red-300"
                            onClick={() => handleAction(() => deleteUser(user._id))}
                            disabled={pendingAction === `delete-user-${user._id}`}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
                <p>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total}
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
                  <span className="px-2 py-1 text-white">
                    {page} / {pagination.pages}
                  </span>
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

      {/* Farmer Details Modal */}
      {detailUser && token && (
        <FarmerDetailsModal
          user={detailUser}
          token={token}
          onClose={() => setDetailUser(null)}
          onUpdated={() => { void loadUsers(); }}
        />
      )}
    </div>
  );
}
