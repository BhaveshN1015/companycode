'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useAuth, type User, type UserRole, attachKisanCard } from '@/context/AuthContext';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';
import { createKisanCard, type KisanCard } from '@/services/kisanCard';
import FarmerOnboardingForm, { type FarmerOnboardingData } from '@/components/auth/FarmerOnboardingForm';

type Step = 1 | 2 | 3;

export default function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestEmailOtp, verifyEmailOtp, register } = useAuth();

  const roleParam: UserRole = searchParams?.get('role') === 'shopkeeper' ? 'shopkeeper' : 'farmer';
  const isShopkeeper = roleParam === 'shopkeeper';
  const googleRegisterUrl = `/api/auth/google?role=${roleParam}`;

  useVoiceGuide('register');

  // ── Step 1: account details ──────────────────────────────────────────────
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devOtp, setDevOtp] = useState('');

  // ── Flow state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);
  const [accountUser, setAccountUser] = useState<User | null>(null);
  const [kisanCard, setKisanCard] = useState<KisanCard | null>(null);
  const [creatingCard, setCreatingCard] = useState(false);

  const totalSteps = isShopkeeper ? 2 : 3;

  const sendOtp = async () => {
    if (!email.trim()) { setError('Please enter your email first'); return; }
    setSendingOtp(true); setError(''); setSuccess('');
    try {
      const data = await requestEmailOtp(email.trim(), roleParam);
      setOtpSent(true); setOtpVerified(false);
      setSuccess('OTP sent! Check your email.');
      setDevOtp(data?.devOtp || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally { setSendingOtp(false); }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) { setError('Please enter the OTP'); return; }
    setVerifyingOtp(true); setError(''); setSuccess('');
    try {
      await verifyEmailOtp(email.trim(), otp.trim());
      setOtpVerified(true);
      setSuccess('Email verified!');
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP');
    } finally { setVerifyingOtp(false); }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) { setError('Please verify your email OTP first'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (isShopkeeper && !name.trim()) { setError('Please enter your name'); return; }
    setSubmitting(true); setError('');
    try {
      const user = await register({
        name: name.trim(), email: email.trim(), password, role: roleParam,
        shopName: isShopkeeper ? shopName.trim() || name.trim() : undefined,
        companyName: isShopkeeper ? shopName.trim() || name.trim() : undefined,
      }, roleParam);
      setAccountUser(user);
      setStep(isShopkeeper ? 3 : 2);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleOnboardingSubmit = async (data: FarmerOnboardingData) => {
    setCreatingCard(true); setError('');
    try {
      const { card, alreadyExisted } = await createKisanCard({
        fullName: data.fullName,
        fatherName: data.fatherName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        mobileNumber: data.mobileNumber,
        personalIncome: data.personalIncome ? Number(data.personalIncome) : undefined,
        familyIncome: data.familyIncome ? Number(data.familyIncome) : undefined,
        location: {
          state: data.state,
          district: data.district,
          tehsil: data.tehsil,
          village: data.village,
          pincode: data.pincode,
        },
        agriculture: {
          totalLandArea: Number(data.totalLandArea),
          landUnit: data.landUnit,
          farmingCategory: data.farmingCategory,
          annualIncomeRange: data.annualIncomeRange,
        },
        otherBusiness: {
          hasOtherBusiness: data.hasOtherBusiness,
          businessType: data.otherBusinessType,
          businessDetails: data.otherBusinessDetails,
        },
      });

      attachKisanCard(card.cardNumber, card.cardStatus);
      setKisanCard(card);
      if (alreadyExisted) {
        setSuccess('You already had a Kisan Card — using it.');
      }
      setStep(3);
    } catch (err: any) {
      setError(err?.message || 'Failed to create Kisan Card. Please try again.');
    } finally {
      setCreatingCard(false);
    }
  };

  const goToDashboard = () => {
    router.push(`/dashboard/${accountUser?.role || (isShopkeeper ? 'shopkeeper' : 'farmer')}`);
  };

  // ── Success screen (shopkeeper or farmer) ───────────────────────────────
  const renderSuccess = () => (
    <div className="text-center py-4">
      <div className="flex justify-center mb-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-lime-500 flex items-center justify-center text-white">
          <FaCheckCircle size={32} />
        </div>
      </div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">
        {isShopkeeper ? 'Account Created!' : 'Your AgroudAn Kisan Card is Ready!'}
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        {isShopkeeper
          ? 'Your shopkeeper account has been created successfully.'
          : 'Your AgroudAn Kisan Card has been created. This is your application identity for AgroudAn.'}
      </p>

      {!isShopkeeper && kisanCard && (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
            Your Kisan Card Number
          </div>
          <div className="text-3xl font-extrabold text-emerald-800 tracking-wider break-all">
            {kisanCard.cardNumber}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Keep this number safe. You will use it along with your mobile OTP to sign in later.
          </p>
        </div>
      )}

      <button
        onClick={goToDashboard}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 text-white font-semibold text-sm shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5"
      >
        Go to Dashboard
      </button>
      {success && <p className="mt-3 text-xs text-emerald-700">{success}</p>}
    </div>
  );

  // ── Progress indicator ──────────────────────────────────────────────────
  const renderProgress = () => (
    <div className="mb-5">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
        <span>Step {step} of {totalSteps}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
        {[...Array(totalSteps)].map((_, i) => {
          const idx = i + 1;
          const active = idx <= step;
          return (
            <div key={idx} className={`h-full flex-1 ${active ? 'bg-gradient-to-r from-emerald-600 to-lime-500' : 'bg-slate-100'}`} />
          );
        })}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_40px_rgba(16,185,129,0.10)] p-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="Logo" width={44} height={44} className="rounded-xl" />
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Create Account</h1>
            <p className="text-xs text-slate-500 capitalize">{roleParam} registration</p>
          </div>
        </div>

        {step < 3 && renderProgress()}

        {/* Alerts */}
        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
        {success && step < 3 && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
        {devOtp && step === 1 && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">Dev OTP: <strong>{devOtp}</strong></div>}

        {/* Step 1: Account */}
        {step === 1 && (
          <>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder={isShopkeeper ? 'Your full name' : 'Farmer name'}
                required
              aria-label="Full name"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm"
            />

            {isShopkeeper && (
              <input
                type="text"
                value={shopName}
                onChange={(e) => { setShopName(e.target.value); setError(''); }}
                placeholder="Shop / business name"
                required
                aria-label="Shop name"
                className="w-full h-11 px-4 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm"
              />
            )}

            {/* Email + Send OTP */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); setOtpSent(false); setOtpVerified(false); }}
                  placeholder="Email address"
                  required
                  aria-label="Email address"
                  className="flex-1 h-11 px-4 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={sendingOtp}
                  className="h-11 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold whitespace-nowrap disabled:opacity-60 hover:bg-emerald-700 transition-colors"
                >
                  {sendingOtp ? '…' : 'Send OTP'}
                </button>
              </div>

              {/* OTP + Verify */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value); setError(''); }}
                  placeholder="Enter OTP"
                  aria-label="OTP code"
                  className="flex-1 h-11 px-4 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={verifyingOtp || !otpSent || otpVerified}
                  className={`h-11 px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    otpVerified
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50'
                  }`}
                >
                  {verifyingOtp ? '…' : otpVerified ? '✓ Done' : 'Verify'}
                </button>
              </div>

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Password (min 6 characters)"
                  required
                  aria-label="Password"
                  className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting || !otpVerified}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 text-white font-semibold text-sm shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 hover:-translate-y-0.5"
              >
                {submitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <a
              href={googleRegisterUrl}
              className="w-full h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5"
            >
              <FcGoogle size={20} />
              Continue with Google
            </a>

            <p className="mt-5 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href={`/auth/login?role=${roleParam}`} className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Login
              </Link>
            </p>
          </>
        )}

        {/* Step 2: Farmer onboarding (farmers only) */}
        {!isShopkeeper && step === 2 && (
          <>
            <div className="mb-3">
              <p className="text-xs text-slate-400">
                Account created. Now tell us a little about your farm to generate your AgroudAn Kisan Card.
              </p>
            </div>
            <FarmerOnboardingForm onSubmit={handleOnboardingSubmit} loading={creatingCard} />
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-700"
            >
              ← Back to account details
            </button>
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && renderSuccess()}
      </div>
    </main>
  );
}
