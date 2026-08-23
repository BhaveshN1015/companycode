import express, { Response } from 'express';
import { AuthenticatedRequest, authenticate, requireAdmin } from '../middleware/auth';
import { AgroudAnKisanCard, IAgroudAnKisanCard } from '../models/AgroudAnKisanCard';
import { User } from '../models/User';
import { FarmerProfileData } from '../models/FarmerProfileData';
import { generateCardNumber } from '../utils/cardNumber';
import { createLogger } from '../utils/logger';

const router = express.Router();
const log = createLogger('kisanCardRoute');

interface CardPayload {
  fullName?: string;
  fatherName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobileNumber?: string;
  personalIncome?: number;
  familyIncome?: number;
  location?: Partial<{
    country: string;
    state: string;
    district: string;
    tehsil: string;
    village: string;
    pincode: string;
    coordinates: { latitude: number; longitude: number };
  }>;
  agriculture?: Partial<{
    totalLandArea: number;
    landUnit: 'acres' | 'hectares' | 'bigha';
    farmingCategory: string;
    annualIncomeRange: string;
  }>;
  otherBusiness?: Partial<{
    hasOtherBusiness: boolean;
    businessType: string;
    businessDetails: string;
  }>;
}

function requireFarmer(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'farmer') {
    return res.status(403).json({ error: 'Only farmers can have an AgroudAn Kisan Card' });
  }
  return null;
}

function computeIsComplete(card: IAgroudAnKisanCard): boolean {
  const loc = (card as any).location || {};
  const ag = (card as any).agriculture || {};
  return Boolean(
    card.fullName &&
      loc.state && loc.district && loc.tehsil && loc.village &&
      (Number(ag.totalLandArea) > 0) &&
      ag.farmingCategory &&
      (card.personalIncome || card.familyIncome)
  );
}

function normalizeLocation(loc?: CardPayload['location']): IAgroudAnKisanCard['location'] {
  if (!loc) return { country: 'India', state: '', district: '', tehsil: '', village: '', pincode: '', coordinates: { latitude: 0, longitude: 0 } };
  const coordinates = loc.coordinates
    ? { latitude: Number(loc.coordinates.latitude || 0), longitude: Number(loc.coordinates.longitude || 0) }
    : { latitude: 0, longitude: 0 };
  return {
    country: loc.country || 'India',
    state: loc.state || '',
    district: loc.district || '',
    tehsil: loc.tehsil || '',
    village: loc.village || '',
    pincode: loc.pincode || '',
    coordinates,
  };
}

function normalizeAgriculture(ag?: CardPayload['agriculture']): IAgroudAnKisanCard['agriculture'] {
  if (!ag) return { totalLandArea: 0, landUnit: 'acres', farmingCategory: '', annualIncomeRange: '' };
  const landUnit = (['acres', 'hectares', 'bigha'] as const).includes(ag.landUnit as any) ? ag.landUnit : 'acres';
  return {
    totalLandArea: Number.isFinite(Number(ag.totalLandArea)) ? Number(ag.totalLandArea) : 0,
    landUnit: landUnit || 'acres',
    farmingCategory: ag.farmingCategory || '',
    annualIncomeRange: ag.annualIncomeRange || '',
  };
}

function normalizeOtherBusiness(ob?: CardPayload['otherBusiness']): IAgroudAnKisanCard['otherBusiness'] {
  if (!ob) return { hasOtherBusiness: false, businessType: '', businessDetails: '' };
  return {
    hasOtherBusiness: Boolean(ob.hasOtherBusiness),
    businessType: ob.businessType || '',
    businessDetails: ob.businessDetails || '',
  };
}

function sanitizeCard(card: IAgroudAnKisanCard): Partial<IAgroudAnKisanCard> {
  return {
    _id: (card as any)._id,
    userId: card.userId,
    cardNumber: card.cardNumber,
    cardStatus: card.cardStatus,
    fullName: card.fullName,
    fatherName: card.fatherName,
    gender: card.gender,
    dateOfBirth: card.dateOfBirth,
    mobileNumber: card.mobileNumber,
    personalIncome: card.personalIncome,
    familyIncome: card.familyIncome,
    location: card.location,
    agriculture: card.agriculture,
    otherBusiness: card.otherBusiness,
    isComplete: card.isComplete,
    issuedAt: card.issuedAt,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

/**
 * Backward-compatible sync: the Kisan Card is the source of truth for the
 * fields it owns. We mirror identity/location/agriculture into the legacy
 * User and FarmerProfileData documents so existing dashboard/profile features
 * keep working unchanged during the transition.
 */
async function syncLegacyStores(userId: string, card: IAgroudAnKisanCard): Promise<void> {
  try {
    const loc = card.location;
    const ag = card.agriculture;
    const userUpdates: Record<string, any> = {};
    if (card.fullName) userUpdates.name = card.fullName;
    if (card.fatherName) userUpdates.companyName = card.fatherName;
    if (loc.state || loc.district) {
      userUpdates.location = {
        country: loc.country,
        state: loc.state,
        district: loc.district,
        village: loc.village,
        coordinates: loc.coordinates,
      };
    }
    if (ag.totalLandArea) userUpdates.farmSize = ag.totalLandArea;
    if (loc.state || loc.district || card.fullName) {
      await User.updateOne({ _id: userId }, { $set: userUpdates });
    }
  } catch (e) {
    log.warn('Failed to sync User from Kisan Card (non-fatal)', { userId, error: (e as Error).message });
  }

  try {
    const loc = card.location;
    const ag = card.agriculture;
    const extUpdates: Record<string, any> = {};
    if (card.fullName) extUpdates.farmName = card.fullName;
    if (loc.state) extUpdates.state = loc.state;
    if (loc.district) extUpdates.district = loc.district;
    if (loc.tehsil) extUpdates.tehsil = loc.tehsil;
    if (loc.village) extUpdates.village = loc.village;
    if (loc.pincode) extUpdates.pincode = loc.pincode;
    if (loc.state || loc.district || card.fullName) {
      await FarmerProfileData.updateOne({ userId }, { $set: extUpdates }, { upsert: true });
    }
  } catch (e) {
    log.warn('Failed to sync FarmerProfileData from Kisan Card (non-fatal)', { userId, error: (e as Error).message });
  }
}

// GET /api/kisan-card/status — lightweight "do I have a card?" check
router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const card = await AgroudAnKisanCard.findOne({ userId: req.user!.userId }).select('cardNumber cardStatus isComplete').lean();
    res.json({
      success: true,
      data: {
        hasCard: !!card,
        cardNumber: card?.cardNumber || null,
        cardStatus: card?.cardStatus || null,
        isComplete: card?.isComplete || false,
      },
    });
  } catch (err: any) {
    log.error('status failed', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to check card status' });
  }
});

// GET /api/kisan-card — return the caller's own card
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const card = await AgroudAnKisanCard.findOne({ userId: req.user!.userId });
    if (!card) {
      return res.status(404).json({ success: false, error: 'No Kisan Card found for this account' });
    }
    res.json({ success: true, data: sanitizeCard(card) });
  } catch (err: any) {
    log.error('get card failed', { error: err.message, userId: req.user?.userId });
    res.status(500).json({ success: false, error: 'Failed to fetch card' });
  }
});

// POST /api/kisan-card — create (idempotent) or return existing card
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const forbidden = requireFarmer(req, res);
    if (forbidden) return;

    const userId = req.user!.userId;

    const existing = await AgroudAnKisanCard.findOne({ userId });
    if (existing) {
      log.info('Kisan Card already exists, returning existing', { userId, cardNumber: existing.cardNumber });
      return res.status(200).json({ success: true, data: sanitizeCard(existing), alreadyExisted: true });
    }

    const body = req.body as CardPayload;
    const fullName = (body.fullName || '').trim();
    if (!fullName) {
      return res.status(400).json({ success: false, error: 'Full name is required for the Kisan Card' });
    }

    const location = normalizeLocation(body.location);
    if (!location.state || !location.district) {
      return res.status(400).json({ success: false, error: 'State and district are required' });
    }

    const agriculture = normalizeAgriculture(body.agriculture);
    const otherBusiness = normalizeOtherBusiness(body.otherBusiness);

    let created: IAgroudAnKisanCard | null = null;
    let lastError: any;
    for (let attempt = 0; attempt < 6; attempt++) {
      const cardNumber = generateCardNumber();
      try {
        const card = new AgroudAnKisanCard({
          userId,
          cardNumber,
          fullName,
          fatherName: body.fatherName || '',
          gender: body.gender || '',
          dateOfBirth: body.dateOfBirth || '',
          mobileNumber: body.mobileNumber || '',
          personalIncome: body.personalIncome || 0,
          familyIncome: body.familyIncome || 0,
          location,
          agriculture,
          otherBusiness,
          isComplete: false,
        });
        card.isComplete = computeIsComplete(card);
        created = await card.save();
        break;
      } catch (e: any) {
        lastError = e;
        if (e?.code === 11000) {
          log.warn('Card number collision, retrying', { attempt, userId });
          continue;
        }
        throw e;
      }
    }

    if (!created) {
      throw lastError || new Error('Unable to generate a unique Kisan Card number');
    }

    await syncLegacyStores(userId, created);

    log.info('Kisan Card created', { userId, cardNumber: created.cardNumber });
    res.status(201).json({ success: true, data: sanitizeCard(created), alreadyExisted: false });
  } catch (err: any) {
    log.error('create card failed', { error: err?.message, userId: req.user?.userId });
    if (err?.code === 11000 && err?.keyPattern?.userId) {
      const existing = await AgroudAnKisanCard.findOne({ userId: req.user!.userId }).catch(() => null);
      if (existing) {
        return res.status(200).json({ success: true, data: sanitizeCard(existing), alreadyExisted: true });
      }
    }
    res.status(500).json({ success: false, error: 'Failed to create Kisan Card' });
  }
});

// PUT /api/kisan-card — update the caller's own card
router.put('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const card = await AgroudAnKisanCard.findOne({ userId });
    if (!card) {
      return res.status(404).json({ success: false, error: 'No Kisan Card found for this account' });
    }

    const body = req.body as CardPayload;
    const updates: Record<string, any> = {};

    if (body.fullName !== undefined) updates.fullName = body.fullName.trim();
    if (body.fatherName !== undefined) updates.fatherName = body.fatherName;
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.dateOfBirth !== undefined) updates.dateOfBirth = body.dateOfBirth;
    if (body.mobileNumber !== undefined) updates.mobileNumber = body.mobileNumber;
    if (body.personalIncome !== undefined) updates.personalIncome = body.personalIncome;
    if (body.familyIncome !== undefined) updates.familyIncome = body.familyIncome;
    if (body.location !== undefined) updates.location = normalizeLocation(body.location);
    if (body.agriculture !== undefined) updates.agriculture = normalizeAgriculture(body.agriculture);
    if (body.otherBusiness !== undefined) updates.otherBusiness = normalizeOtherBusiness(body.otherBusiness);

    const updated = await AgroudAnKisanCard.findOneAndUpdate({ userId }, { $set: updates }, { new: true });
    updated!.isComplete = computeIsComplete(updated!);
    await updated!.save();
    await syncLegacyStores(userId, updated!);

    res.json({ success: true, data: sanitizeCard(updated!) });
  } catch (err: any) {
    log.error('update card failed', { error: err.message, userId: req.user?.userId });
    res.status(500).json({ success: false, error: 'Failed to update Kisan Card' });
  }
});

// Admin support: look up a farmer's card by userId
router.get('/admin/user/:userId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const card = await AgroudAnKisanCard.findOne({ userId: req.params.userId });
    if (!card) {
      return res.status(404).json({ success: false, error: 'No Kisan Card for this user' });
    }
    res.json({ success: true, data: sanitizeCard(card) });
  } catch (err: any) {
    log.error('admin lookup failed', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to look up Kisan Card' });
  }
});

// Admin support: update an AgroudAn Kisan Card for a specific farmer.
// Only admin-authored profile fields are accepted. The cardNumber is NEVER
// changed — it is the immutable identity of the card.
router.put('/admin/user/:userId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const card = await AgroudAnKisanCard.findOne({ userId: req.params.userId });
    if (!card) {
      return res.status(404).json({ success: false, error: 'No Kisan Card for this user' });
    }

    const body = req.body as CardPayload & { cardStatus?: string };
    const updates: Record<string, any> = {};

    if (body.fullName !== undefined) {
      const v = (body.fullName || '').trim();
      if (v) updates.fullName = v;
    }
    if (body.fatherName !== undefined) updates.fatherName = body.fatherName;
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.dateOfBirth !== undefined) updates.dateOfBirth = body.dateOfBirth;
    if (body.location !== undefined) updates.location = normalizeLocation(body.location);
    if (body.agriculture !== undefined) updates.agriculture = normalizeAgriculture(body.agriculture);
    if (body.cardStatus !== undefined && ['active', 'pending', 'suspended'].includes(body.cardStatus)) {
      updates.cardStatus = body.cardStatus;
    }
    // cardNumber is intentionally never set here.

    const updated = await AgroudAnKisanCard.findOneAndUpdate({ userId: card.userId }, { $set: updates }, { new: true });
    updated!.isComplete = computeIsComplete(updated!);
    await updated!.save();
    await syncLegacyStores(card.userId, updated!);

    res.json({ success: true, data: sanitizeCard(updated!) });
  } catch (err: any) {
    log.error('admin update card failed', { error: err.message, userId: req.params.userId });
    res.status(500).json({ success: false, error: 'Failed to update Kisan Card' });
  }
});

export default router;
