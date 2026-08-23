function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export interface CardOtpRequest {
  delivered: boolean;
  message: string;
  maskedMobile: string | null;
  devOtp?: string;
}

export interface CardLoginResult {
  token: string;
  user: { id: string; name: string; email: string; role: string; verified: boolean; phone?: string };
}

export async function requestCardOtp(cardNumber: string, mobile: string): Promise<CardOtpRequest> {
  const res = await fetch('/api/auth/card/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber, mobile }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || 'Failed to send OTP');
  return json;
}

export async function verifyCardOtp(cardNumber: string, mobile: string, otp: string): Promise<CardLoginResult> {
  const res = await fetch('/api/auth/card/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber, mobile, otp }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'OTP verification failed');
  return json;
}

export function authHeadersFor(): Record<string, string> {
  return authHeaders();
}
