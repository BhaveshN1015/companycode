import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User';
import { AgroudAnKisanCard } from '../models/AgroudAnKisanCard';
import { normalizeCardNumber } from '../utils/cardNumber';
import { OtpStore, generateOtpCode, normalizeMobile, maskMobile, OTP_MAX_ATTEMPTS } from '../utils/otpStore';
import { sendSms } from '../utils/smsNotification';
import { createLogger } from '../utils/logger';

const router = express.Router();
const log = createLogger('cardLoginRoute');

// Mirror the existing OTP rate limiting from index.ts (5 requests / 10 min)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests, please try again later.' },
  skip: () => process.env.NODE_ENV === 'development',
});

router.use(otpLimiter);

const mobileOtpStore = new OtpStore();

function safeUser(user: { _id: any; name: string; email: string; role: string; verified: boolean; phone?: string }) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified,
    phone: user.phone,
  };
}

function cardOtpKey(cardNumber: string, mobile: string): string {
  return `${normalizeCardNumber(cardNumber)}|${normalizeMobile(mobile)}`;
}

const GENERIC_OK = {
  ok: true,
  delivered: false,
  message: 'If your AgroudAn Kisan Card number and registered mobile number are correct, an OTP has been sent to your registered mobile number.',
  maskedMobile: null,
};

// POST /api/auth/card/request-otp
// Body: { cardNumber, mobile }
// Reuses OTP semantics (6-digit, 10-min TTL, 5 attempts). Delivers via the
// existing sendSms utility (MSG91). Returns the same shape as the email OTP
// flow. Responses are intentionally generic to prevent card-number enumeration:
// no distinction is made between "card not found" and "mobile mismatch".
router.post('/request-otp', async (req: Request, res: Response) => {
  try {
    const rawCard = (req.body?.cardNumber || '').toString();
    const rawMobile = (req.body?.mobile || '').toString();

    if (!normalizeCardNumber(rawCard) || !normalizeMobile(rawMobile)) {
      return res.status(400).json({ ok: false, delivered: false, error: 'Card number and mobile number are required.' });
    }

    const cardNumber = normalizeCardNumber(rawCard);
    const mobile = normalizeMobile(rawMobile);

    const card = await AgroudAnKisanCard.findOne({ cardNumber, cardStatus: 'active' }).select('userId').lean();
    let user: any = null;
    if (card?.userId) {
      user = await User.findById(card.userId).select('phone name role verified isActive email').lean();
    }

    const userMobile = user ? normalizeMobile(user.phone || '') : '';
    if (!user || userMobile !== mobile || !user.verified || !user.isActive) {
      log.info('card request-otp: invalid combo (no details disclosed)', { cardNumber });
      return res.json(GENERIC_OK);
    }

    const code = generateOtpCode();
    mobileOtpStore.set(cardOtpKey(cardNumber, mobile), code);

    let delivered = false;
    try {
      const result = await sendSms(mobile, `Your AgroudAn Kisan Card OTP is ${code}. It is valid for 10 minutes. - AgroudAn Kisan Pragati`);
      delivered = !!result?.sent;
    } catch (e) {
      log.warn('SMS delivery error during card login (non-fatal)', { error: (e as Error).message });
    }

    log.info('card login OTP generated', { cardNumber, delivered, masked: maskMobile(mobile) });

    // Dev convenience mirrors the existing email OTP flow: expose devOtp only
    // when the SMS provider did not deliver (e.g. MSG91 not configured locally).
    return res.json({
      ok: true,
      delivered,
      message: 'OTP sent to your registered mobile number.',
      maskedMobile: maskMobile(mobile),
      ...(delivered ? {} : { devOtp: code }),
    });
  } catch (err: any) {
    log.error('card request-otp failed', { error: err?.message });
    return res.status(500).json({ ok: false, error: 'Something went wrong while sending the OTP.' });
  }
});

// POST /api/auth/card/verify-otp
// Body: { cardNumber, mobile, otp }
// On success: issues the SAME JWT the existing /api/auth/login would issue.
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const cardNumber = normalizeCardNumber(req.body?.cardNumber || '');
    const mobile = normalizeMobile(req.body?.mobile || '');
    const otp = (req.body?.otp || '').toString().trim();

    if (!cardNumber || !mobile || !otp) {
      return res.status(400).json({ ok: false, error: 'Card number, mobile number, and OTP are required.' });
    }

    const result = mobileOtpStore.verify(cardOtpKey(cardNumber, mobile), otp);
    if (!result.ok) {
      if (result.reason === 'too_many') return res.status(429).json({ ok: false, error: 'Too many OTP attempts. Please request a new code.' });
      if (result.reason === 'expired') return res.status(400).json({ ok: false, error: 'OTP expired or not requested. Please request a new OTP.' });
      return res.status(400).json({ ok: false, error: 'Invalid OTP.' });
    }

    const card = await AgroudAnKisanCard.findOne({ cardNumber, cardStatus: 'active' }).select('userId').lean();
    if (!card?.userId) {
      log.warn('card verify-otp: no active card for cardNumber (after OTP ok)', { cardNumber });
      return res.status(400).json({ ok: false, error: 'Unable to verify card. Please try again.' });
    }

    const user = await User.findById(card.userId).select('-password');
    if (!user || !user.verified || !user.isActive) {
      return res.status(400).json({ ok: false, error: 'Account not available for card login.' });
    }

    mobileOtpStore.delete(cardOtpKey(cardNumber, mobile));

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    });

    log.info('card login successful', { userId: user._id, cardNumber });
    return res.json({ ok: true, message: 'Login successful', token, user: safeUser(user) });
  } catch (err: any) {
    log.error('card verify-otp failed', { error: err?.message });
    return res.status(500).json({ ok: false, error: 'Something went wrong during login.' });
  }
});

export default router;
