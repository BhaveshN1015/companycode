import { ShopkeeperProfile } from '../models/ShopkeeperProfile';
import { FertilizerProduct } from '../models/FertilizerProduct';
import { NurseryProduct } from '../models/NurseryProduct';
import { OrganicProduct } from '../models/OrganicProduct';
import { haversineKm, Coordinates } from './kvkService';

const PRODUCT_ALIASES: Record<string, string[]> = {
  'dap': ['dap', 'डीएपी', 'डाई-अमोनियम फॉस्फेट', 'diammonium phosphate', '18:46:0', '18-46-0'],
  'urea': ['urea', 'यूरिया', 'यूरिया'],
  'mop': ['mop', 'मोप', 'potash', 'पोटाश', 'muriate of potash', '60:0:0'],
  'npk': ['npk', 'एनपीके', 'complex fertilizer'],
  'ssp': ['ssp', 'एसएसपी', 'single super phosphate'],
  'ammonium sulphate': ['ammonium sulphate', 'अमोनियम सल्फेट', 'sulfate'],
  'calcium': ['calcium', 'कैल्शियम', 'can', 'calcium ammonium nitrate'],
  'vermicompost': ['vermicompost', 'वर्मी कम्पोस्ट', 'वर्मीकम्पोस्ट', 'worm compost'],
  'neem cake': ['neem cake', 'नीम खली', 'neem khali', 'neem seed cake'],
  'jeevamrit': ['jeevamrit', 'जीवामृत', 'jeevamruth'],
  'panchgavya': ['panchgavya', 'पंचगव्य'],
  'bio fertilizer': ['bio fertilizer', 'जैविक उर्वरक', 'bio-fertilizer'],
  'organic manure': ['organic manure', 'जैविक खाद', 'organic fertilizer'],
  'compost': ['compost', 'कम्पोस्ट', 'खाद'],
  'fym': ['fym', 'एफवाईएम', 'farm yard manure', 'farmyard manure', 'gobar ki khad'],
  'rock phosphate': ['rock phosphate', 'रॉक फॉस्फेट'],
  'wood ash': ['wood ash', 'वुड ऐश', 'राख'],
};

function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getProductSearchTerms(productName: string): string[] {
  const normalized = normalizeProductName(productName);
  const terms: string[] = [normalized];

  for (const [canonical, aliases] of Object.entries(PRODUCT_ALIASES)) {
    if (aliases.some(a => normalized.includes(a) || a.includes(normalized))) {
      terms.push(...aliases);
    }
  }

  return [...new Set(terms)];
}

export interface FarmerLocation {
  latitude?: number;
  longitude?: number;
  village?: string;
  tehsil?: string;
  district?: string;
  state?: string;
}

export interface ProductRequirement {
  productName: string;
  category: 'seed' | 'fertilizer' | 'organic' | 'pesticide' | 'plant' | 'other';
  quantity?: number;
  unit?: string;
}

export interface ShopMatch {
  shop: {
    _id: string;
    shopName: string;
    shopType: string;
    ownerName: string;
    mobileNumber: string;
    email: string;
    address: string;
    village: string;
    tehsil: string;
    district: string;
    state: string;
    pincode: string;
    verificationStatus: string;
    latitude: number;
    longitude: number;
  };
  distanceKm: number | null;
  score: number;
  products: Array<{
    _id: string;
    productName: string;
    brandName: string;
    category: string;
    productSubCategory: string;
    sellingPrice: number;
    mrp: number;
    quantity: number;
    unit: string;
    stockStatus: string;
    productImages: string[];
  }>;
}

const sv = (s?: string) => s?.toLowerCase().trim() || '';

function computeProximityScore(shop: any, loc: FarmerLocation): { score: number; distanceKm: number | null } {
  let score = 0;
  let distanceKm: number | null = null;

  if (shop.verificationStatus === 'verified') score += 10000;
  if (loc.village && sv(shop.village) === sv(loc.village)) score += 8000;
  else if (loc.tehsil && sv(shop.tehsil) === sv(loc.tehsil)) score += 4000;
  if (loc.district && sv(shop.district) === sv(loc.district)) score += 2000;
  if (loc.state && sv(shop.state) === sv(loc.state)) score += 500;

  if (loc.latitude && loc.longitude && shop.latitude && shop.longitude) {
    distanceKm = Math.round(haversineKm(
      { latitude: loc.latitude, longitude: loc.longitude },
      { latitude: shop.latitude, longitude: shop.longitude }
    ) * 10) / 10;
    score -= distanceKm;
  }

  return { score, distanceKm };
}

function getShopTypeForCategory(category: string): string[] {
  switch (category) {
    case 'seed':
    case 'fertilizer':
    case 'pesticide':
      return ['fertilizer'];
    case 'organic':
      return ['organic'];
    case 'plant':
      return ['nursery'];
    default:
      return ['fertilizer', 'organic', 'nursery'];
  }
}

async function findFertilizerProducts(shopIds: string[], productName: string, cropType?: string) {
  const query: any = {
    shopkeeperId: { $in: shopIds },
    stockStatus: 'in_stock',
  };

  if (productName) {
    const searchTerms = getProductSearchTerms(productName);
    const orConditions: any[] = [];

    for (const term of searchTerms) {
      if (term.length < 2) continue;
      const nameRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      orConditions.push({ productName: nameRegex });
      orConditions.push({ brandName: nameRegex });
      orConditions.push({ nutrientComposition: nameRegex });
    }

    if (orConditions.length) query.$or = orConditions;
  }

  if (cropType) {
    const cropRegex = new RegExp(cropType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = query.$or || [];
    query.$or.push({ cropType: cropRegex });
    query.$or.push({ cropSuitability: cropRegex });
  }

  return FertilizerProduct.find(query).lean();
}

async function findOrganicProducts(shopIds: string[], productName: string, cropType?: string) {
  const query: any = {
    shopkeeperId: { $in: shopIds },
    stockStatus: 'in_stock',
  };

  if (productName) {
    const searchTerms = getProductSearchTerms(productName);
    const orConditions: any[] = [];

    for (const term of searchTerms) {
      if (term.length < 2) continue;
      const nameRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      orConditions.push({ productName: nameRegex });
      orConditions.push({ brandName: nameRegex });
      orConditions.push({ ingredients: nameRegex });
    }

    if (orConditions.length) query.$or = orConditions;
  }

  if (cropType) {
    const cropRegex = new RegExp(cropType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = query.$or || [];
    query.$or.push({ cropType: cropRegex });
    query.$or.push({ cropSuitability: cropRegex });
  }

  return OrganicProduct.find(query).lean();
}

async function findNurseryProducts(shopIds: string[], productName: string) {
  const query: any = {
    shopkeeperId: { $in: shopIds },
    stockStatus: 'in_stock',
  };

  if (productName) {
    const searchTerms = getProductSearchTerms(productName);
    const orConditions: any[] = [];

    for (const term of searchTerms) {
      if (term.length < 2) continue;
      const nameRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      orConditions.push({ plantName: nameRegex });
      orConditions.push({ variety: nameRegex });
    }

    if (orConditions.length) query.$or = orConditions;
  }

  return NurseryProduct.find(query).lean();
}

export async function findShopsForProducts(
  requirements: ProductRequirement[],
  farmerLocation: FarmerLocation,
  options: { maxResults?: number; maxDistanceKm?: number } = {}
): Promise<ShopMatch[]> {
  const { maxResults = 10, maxDistanceKm } = options;

  const shopTypes = new Set<string>();
  requirements.forEach(r => {
    getShopTypeForCategory(r.category).forEach(t => shopTypes.add(t));
  });

  const shopQuery: any = {
    profileCompleted: true,
    suspended: false,
    verificationStatus: { $in: ['verified', 'pending'] },
    shopType: { $in: Array.from(shopTypes) },
  };

  if (farmerLocation.state) shopQuery.state = farmerLocation.state;

  const shops = await ShopkeeperProfile.find(shopQuery).lean();
  if (!shops.length) return [];

  const shopIds = shops.map(s => s._id.toString());

  const productResults: Record<string, any[]> = {};

  for (const req of requirements) {
    const cacheKey = `${req.category}:${req.productName}`;
    if (productResults[cacheKey]) continue;

    let products: any[] = [];
    switch (req.category) {
      case 'seed':
      case 'fertilizer':
      case 'pesticide':
        products = await findFertilizerProducts(shopIds, req.productName);
        break;
      case 'organic':
        products = await findOrganicProducts(shopIds, req.productName);
        break;
      case 'plant':
        products = await findNurseryProducts(shopIds, req.productName);
        break;
      default:
        const [fert, org, nurse] = await Promise.all([
          findFertilizerProducts(shopIds, req.productName),
          findOrganicProducts(shopIds, req.productName),
          findNurseryProducts(shopIds, req.productName),
        ]);
        products = [...fert, ...org, ...nurse];
    }
    productResults[cacheKey] = products;
  }

  const allProducts = Object.values(productResults).flat();
  if (!allProducts.length) return [];

  const productsByShop = new Map<string, any[]>();
  allProducts.forEach(p => {
    const sid = p.shopkeeperId.toString();
    if (!productsByShop.has(sid)) productsByShop.set(sid, []);
    productsByShop.get(sid)!.push(p);
  });

  const matches: ShopMatch[] = [];

  for (const shop of shops) {
    const shopId = shop._id.toString();
    const shopProducts = productsByShop.get(shopId) || [];
    if (!shopProducts.length) continue;

    const { score, distanceKm } = computeProximityScore(shop, farmerLocation);

    if (maxDistanceKm && distanceKm && distanceKm > maxDistanceKm) continue;

    matches.push({
      shop: {
        _id: shop._id.toString(),
        shopName: shop.shopName,
        shopType: shop.shopType,
        ownerName: shop.ownerName,
        mobileNumber: shop.mobileNumber,
        email: shop.email,
        address: shop.address,
        village: shop.village,
        tehsil: shop.tehsil,
        district: shop.district,
        state: shop.state,
        pincode: shop.pincode,
        verificationStatus: shop.verificationStatus,
        latitude: shop.latitude,
        longitude: shop.longitude,
      },
      distanceKm,
      score,
      products: shopProducts.slice(0, 5).map(p => ({
        _id: p._id,
        productName: p.productName || p.plantName,
        brandName: p.brandName || '',
        category: p.category || '',
        productSubCategory: p.productSubCategory || '',
        sellingPrice: p.sellingPrice || p.price || 0,
        mrp: p.mrp || 0,
        quantity: p.quantity || p.availableQuantity || 0,
        unit: p.unit || 'kg',
        stockStatus: p.stockStatus,
        productImages: p.productImages || [],
      })),
    });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

export async function findShopsForCrop(
  cropName: string,
  farmerLocation: FarmerLocation,
  options: { maxResults?: number } = {}
): Promise<ShopMatch[]> {
  const requirements: ProductRequirement[] = [
    { productName: cropName, category: 'seed' },
    { productName: 'fertilizer', category: 'fertilizer' },
    { productName: 'organic', category: 'organic' },
  ];

  return findShopsForProducts(requirements, farmerLocation, options);
}
