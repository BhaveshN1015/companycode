import crypto from 'crypto';
import { logger } from './logger';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  verifiedAt?: number;
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_CODE_LENGTH = 6;

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function normalizeMobile(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.slice(-10);
}

export function maskMobile(mobile: string): string {
  const m = normalizeMobile(mobile);
  if (m.length < 4) return '****';
  return '*'.repeat(m.length - 4) + m.slice(-4);
}

/**
 * In-memory OTP store mirroring the existing email OTP store in src/routes/auth.ts.
 * Keyed by an opaque identifier (e.g. cardNumber|mobile). Never persists OTP
 * as permanent user/profile data.
 */
export class OtpStore {
  private store = new Map<string, OtpRecord>();

  get(key: string): OtpRecord | null {
    const record = this.store.get(key);
    if (!record) return null;
    if (record.expiresAt < Date.now()) {
      this.store.delete(key);
      logger.info('OTP expired and removed', { key });
      return null;
    }
    return record;
  }

  set(key: string, code: string): void {
    this.store.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  verify(key: string, code: string): { ok: boolean; reason: 'expired' | 'too_many' | 'invalid' | 'ok' } {
    const record = this.get(key);
    if (!record) return { ok: false, reason: 'expired' };
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      this.store.delete(key);
      logger.warn('OTP attempts exhausted', { key });
      return { ok: false, reason: 'too_many' };
    }
    record.attempts += 1;
    if (record.code !== code) {
      this.store.set(key, record);
      return { ok: false, reason: 'invalid' };
    }
    record.verifiedAt = Date.now();
    this.store.set(key, record);
    return { ok: true, reason: 'ok' };
  }
}
