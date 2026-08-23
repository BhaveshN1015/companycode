'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaEye, FaEyeSlash, FaIdCard, FaMobile } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useAuth, type UserRole } from '@/context/AuthContext';
import { useVoiceGuide } from '@/hooks/useVoiceGuide';

type AuthMode = 'password' | 'card';

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam: UserRole = searchParams?.get('role') === 'shopkeeper' ? 'shopkeeper' : 'farmer';

  const { login, requestCardOtp, loginWithCardOtp } = useAuth();
  const voiceGuide = useVoiceGuide('login');

  // ── Shared state ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AuthMode>('password');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Password mode state ──────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Card mode state ──────────────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');

  const googleLoginUrl = `/api/auth/google?role=${roleParam}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (rememberMe) localStorage.setItem('rememberedEmail', email.trim());
      else localStorage.removeItem('rememberedEmail');
      const user = await login(email, password, roleParam);
      router.push(`/dashboard/${user.role}`);
    } catch (err: any) {
      const msg = err?.message || '';
      setError(
        msg === 'Invalid credentials'
          ? "Incorrect email or password. Please register if you don't have an account."
          : msg || 'Login failed. Please try again.'
      );
      voiceGuide.triggerError();
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError(''); setSuccess('');
    const normalizedCard = cardNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (!normalizedCard) return setError('Please enter your AgroudAn Kisan Card number.');
    if (normalizeMobile(mobile).length < 10) return setError('Please enter a valid 10-digit mobile number.');
    setSendingOtp(true);
    try {
      const data = await requestCardOtp(normalizedCard, mobile);
      setOtpSent(true); setOtp('');
      setMaskedMobile(data.maskedMobile || '');
      if (data.delivered) {
        setSuccess(`OTP sent to your mobile ending in ${maskLast4(mobile)}.`);
      } else {
        setSuccess('OTP generated (check locally).');
      }
      setDevOtp(data.devOtp || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleCardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length < 4) return setError('Please enter the OTP.');
    setVerifyingOtp(true);
    try {
      const user = await loginWithCardOtp(cardNumber.trim().toUpperCase().replace(/\s+/g, ''), mobile, otp);
      router.push(`/dashboard/${user.role}`);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
      voiceGuide.triggerError();
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_40px_rgba(16,185,129,0.10)] p-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="Logo" width={44} height={44} className="rounded-xl" />
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Welcome back</h1>
            <p className="text-xs text-slate-500 capitalize">{roleParam} login</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 mb-5 p-1 bg-slate-50 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('password'); setError(''); setSuccess(''); }}
            className={`flex-1 text-center py-1.5 text-sm font-semibold rounded-lg transition ${
              mode === 'password' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => { setMode('card'); setError(''); setSuccess(''); setOtpSent(false); setDevOtp(''); }}
            className={`flex-1 text-center py-1.5 text-sm font-semibold rounded-lg transition ${
              mode === 'card' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Kisan Card + OTP
          </button>
        </div>

        {/* Alerts */}
        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}
        {success && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
        {devOtp && mode === 'card' && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">Dev OTP: <strong>{devOtp}</strong></div>
        )}

        {/* ── Password mode (existing, unchanged) ── */}
        {mode === 'password' && (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="Email address"
                required
                aria-label="Email address"
                className="w-full h-11 px-4 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Password"
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                  <span className="text-sm text-slate-500">Remember me</span>
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 text-white font-semibold text-sm shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 hover:-translate-y-0.5"
              >
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <a
              href={googleLoginUrl}
              className="w-full h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5"
            >
              <FcGoogle size={20} />
              Continue with Google
            </a>

            <p className="mt-5 text-center text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href={`/auth/register?role=${roleParam}`} className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Create Account
              </Link>
            </p>
          </>
        )}

        {/* ── Card + OTP mode (new, farmer-only login) ── */}
        {mode === 'card' && (
          <>
            <p className="mb-4 text-xs text-slate-500">
              अपना AgroudAn Kisan Card Number और registered mobile number दर्ज करें। OTP verify करने के बाद आप सुरक्षित रूप से login कर सकेंगे।
            </p>

            <form onSubmit={handleCardLogin} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => { setCardNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/gi, '')); setError(''); }}
                  placeholder="AgroudAn Kisan Card Number"
                  required
                  aria-label="Kisan Card number"
                  className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm font-mono"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FaIdCard size={16} /></span>
              </div>

              <div className="relative">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  placeholder="+91  XXXXX XXXXX"
                  maxLength={10}
                  required
                  aria-label="Registered mobile number"
                  className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FaMobile size={16} /></span>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="w-full h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 hover:bg-emerald-700"
                >
                  {sendingOtp ? 'Sending…' : 'Send OTP'}
                </button>
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                      placeholder="Enter OTP"
                      required
                      aria-label="OTP code"
                      className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all text-sm"
                    />
                    <button
                      type="submit"
                      disabled={verifyingOtp}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      {verifyingOtp ? '…' : 'Login'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">OTP is valid for 10 minutes. {maskedMobile ? `Sent to ending in ${maskLast4(mobile)}.` : ''}</p>
                </>
              )}
            </form>

            <p className="mt-4 text-center text-xs text-slate-400">
              Don't have a Kisan Card yet?{' '}
              <Link href={`/auth/register?role=${roleParam}`} className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Create Account & Card
              </Link>
            </p>
          </>
        )}

        {/* Role switch */}
        <p className="mt-4 text-center text-xs text-slate-400">
          <Link href="/auth/role-select" className="hover:text-slate-600">
            Switch role (Farmer / Shopkeeper)
          </Link>
        </p>
      </div>
    </main>
  );
}

function normalizeMobile(raw: string): string {
  return (raw || '').replace(/\D/g, '').slice(-10);
}

function maskLast4(mobile: string): string {
  const m = normalizeMobile(mobile);
  if (m.length < 4) return '****';
  return '******' + m.slice(-4);
}
