"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaIdCard, FaCopy, FaCheck, FaExclamationCircle } from 'react-icons/fa';
import { getKisanCard, getKisanCardStatus, type KisanCard, type CardStatusResponse } from '@/services/kisanCard';

export default function DashboardKisanCard() {
  const router = useRouter();
  const [status, setStatus] = useState<CardStatusResponse | null>(null);
  const [card, setCard] = useState<KisanCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await getKisanCardStatus();
        if (!active) return;
        setStatus(s);
        if (s.hasCard) {
          const c = await getKisanCard();
          if (active) setCard(c);
        }
      } catch (e: any) {
        if (active) setError(e.message || 'Failed to load card');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const copyNumber = async () => {
    if (!card?.cardNumber) return;
    try {
      await navigator.clipboard.writeText(card.cardNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy card number');
    }
  };

  const openProfile = () => router.push('/dashboard/farmer/profile');

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <FaIdCard size={18} className="text-slate-400 animate-pulse" />
          <span>Loading your AgroudAn Kisan Card…</span>
        </div>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 mb-6">
        <div className="flex items-start gap-3 text-sm text-red-600">
          <FaExclamationCircle className="mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-600 p-5 sm:p-6 shadow-xl shadow-emerald-200/40 mb-6 text-white">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <FaIdCard size={18} />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">AgroudAn Kisan Card</div>
            <div className="text-lg font-bold">Farmer Identity</div>
          </div>
        </div>
      </div>

      {!status?.hasCard && (
        <div className="mt-3 text-sm text-emerald-50">
          <p className="font-medium">आपका AgroudAn Kisan Card अभी नहीं बना है।</p>
          <p className="text-xs mt-1 opacity-80">
            किसान कार्ड बनाने से आपको सरकारी योजनाओं की पात्रता मिलती है।
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => router.push('/dashboard/farmer/profile')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white text-emerald-700 px-3.5 py-1.5 text-xs font-semibold hover:bg-emerald-50 transition"
            >
              कार्ड बनाएं
            </button>
            <button
              onClick={() => router.push('/schemes')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-white/30 transition"
            >
              योजनाएँ देखें
            </button>
          </div>
        </div>
      )}

      {status?.hasCard && card && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-2xl font-mono font-extrabold tracking-wider break-all">
              {card.cardNumber}
            </div>
            <button
              onClick={copyNumber}
              title="Copy card number"
              className="flex-shrink-0 rounded-lg bg-white/15 hover:bg-white/25 p-1.5 text-xs text-white transition"
            >
              {copied ? <FaCheck size={13} /> : <FaCopy size={13} />}
            </button>
          </div>

          {copied && <div className="mt-1 text-xs text-emerald-100/80">Saved to clipboard ✓</div>}

          <div className="mt-3">
            <button
              onClick={openProfile}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white text-emerald-700 px-3.5 py-1.5 text-xs font-semibold hover:bg-emerald-50 transition"
            >
              View Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
