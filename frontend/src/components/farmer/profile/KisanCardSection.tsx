"use client";

import { useEffect, useState } from 'react';
import { FaIdCard, FaPlus, FaCheckCircle, FaHourglass } from 'react-icons/fa';
import { getKisanCardStatus, getKisanCard, createKisanCard, type CardStatusResponse, type KisanCard } from '@/services/kisanCard';
import FarmerOnboardingForm, { type FarmerOnboardingData } from '@/components/auth/FarmerOnboardingForm';

export default function KisanCardSection() {
  const [status, setStatus] = useState<CardStatusResponse | null>(null);
  const [card, setCard] = useState<KisanCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadStatus = async () => {
    setLoading(true); setError(null);
    try {
      const s = await getKisanCardStatus();
      setStatus(s);
      if (s.hasCard) {
        const c = await getKisanCard();
        setCard(c);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load Kisan Card');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleOnboard = async (data: FarmerOnboardingData) => {
    setCreating(true); setError(null);
    try {
      const { card: c } = await createKisanCard({
        fullName: data.fullName,
        fatherName: data.fatherName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        mobileNumber: data.mobileNumber,
        personalIncome: data.personalIncome ? Number(data.personalIncome) : undefined,
        familyIncome: data.familyIncome ? Number(data.familyIncome) : undefined,
        location: {
          state: data.state, district: data.district, tehsil: data.tehsil,
          village: data.village, pincode: data.pincode,
        },
        agriculture: {
          totalLandArea: Number(data.totalLandArea), landUnit: data.landUnit,
          farmingCategory: data.farmingCategory,
          annualIncomeRange: data.annualIncomeRange,
        },
        otherBusiness: {
          hasOtherBusiness: data.hasOtherBusiness,
          businessType: data.otherBusinessType,
          businessDetails: data.otherBusinessDetails,
        },
      });
      setCard(c);
      setStatus({ hasCard: true, cardNumber: c.cardNumber, cardStatus: c.cardStatus, isComplete: c.isComplete });
      setShowOnboarding(false);
    } catch (e: any) {
      setError(e.message || 'Failed to create Kisan Card');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <FaHourglass size={16} className="animate-spin" />
          <span>Checking your Kisan Card…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
          <FaIdCard size={16} />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-800">AgroudAn Kisan Card</div>
          <div className="text-xs text-gray-400">Your application farmer identity</div>
        </div>
      </div>

      <div className="p-5">
        {error && <div className="mb-3 text-xs text-red-500">{error}</div>}

        {!status?.hasCard && !showOnboarding && (
          <div className="text-center py-4">
            <p className="text-sm text-slate-600 mb-4">
              You don&apos;t have an AgroudAn Kisan Card yet. Creating one links your account to a unique, private
              farmer identity used to personalize your schemes and advisory.
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition"
            >
              <FaPlus size={12} /> Create Your Kisan Card
            </button>
          </div>
        )}

        {status?.hasCard && card && !showOnboarding && (
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Card Number</div>
              <div className="text-2xl font-extrabold text-slate-800 font-mono">{card.cardNumber}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-slate-500">Status:</span>
                <span className="text-xs font-medium text-emerald-700">
                  {(card.cardStatus === 'active' ? 'Active' : card.cardStatus)}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <FaCheckCircle className="text-3xl text-emerald-200" />
            </div>
          </div>
        )}

        {showOnboarding && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Complete your details</h4>
              <button onClick={() => setShowOnboarding(false)} className="text-xs text-slate-400 hover:text-slate-700">
                Cancel
              </button>
            </div>
            <FarmerOnboardingForm onSubmit={handleOnboard} loading={creating} />
          </div>
        )}
      </div>
    </div>
  );
}
