'use client';

import { MapPin, Phone, CheckCircle, XCircle, Store, Sprout, Leaf, TreeDeciduous } from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace('/api', '');

export interface ShopProduct {
  _id: string;
  productName: string;
  brandName: string;
  sellingPrice: number;
  quantity: number;
  unit: string;
  stockStatus: string;
  productImages: string[];
}

export interface ShopData {
  _id: string;
  shopName: string;
  shopType: string;
  ownerName: string;
  mobileNumber: string;
  address: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  pincode: string;
  verificationStatus: string;
}

export interface ShopMatch {
  shop: ShopData;
  distanceKm: number | null;
  products: ShopProduct[];
}

interface ShopRecommendationCardProps {
  shop: ShopMatch;
  onViewShop?: (shopId: string) => void;
}

function getShopIcon(shopType: string) {
  switch (shopType) {
    case 'fertilizer':
      return <Sprout className="w-4 h-4" />;
    case 'organic':
      return <TreeDeciduous className="w-4 h-4" />;
    case 'nursery':
      return <Leaf className="w-4 h-4" />;
    default:
      return <Store className="w-4 h-4" />;
  }
}

function getShopTypeLabel(shopType: string) {
  switch (shopType) {
    case 'fertilizer':
      return 'Fertilizer Shop';
    case 'organic':
      return 'Organic Shop';
    case 'nursery':
      return 'Nursery';
    default:
      return 'Shop';
  }
}

export default function ShopRecommendationCard({ shop, onViewShop }: ShopRecommendationCardProps) {
  const { shop: shopInfo, distanceKm, products } = shop;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            {getShopIcon(shopInfo.shopType)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{shopInfo.shopName || 'Unnamed Shop'}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-emerald-600 font-medium">{getShopTypeLabel(shopInfo.shopType)}</span>
              {shopInfo.verificationStatus === 'verified' && (
                <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
        {distanceKm !== null && (
          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg whitespace-nowrap">
            {distanceKm} km
          </span>
        )}
      </div>

      {(shopInfo.village || shopInfo.district) && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>
            {[shopInfo.village, shopInfo.district, shopInfo.state].filter(Boolean).join(', ')}
          </span>
        </div>
      )}

      {products.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-gray-700">Available Products:</p>
          <div className="space-y-1.5">
            {products.slice(0, 3).map((product) => (
              <div key={product._id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${product.stockStatus === 'in_stock' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-gray-700">{product.productName}</span>
                </div>
                <span className="text-gray-900 font-medium">₹{product.sellingPrice}/{product.unit}</span>
              </div>
            ))}
            {products.length > 3 && (
              <p className="text-xs text-gray-400 pl-4">+{products.length - 3} more products</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        {shopInfo.mobileNumber && (
          <a
            href={`tel:${shopInfo.mobileNumber}`}
            className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Phone className="w-3 h-3" />
            Call
          </a>
        )}
        {onViewShop && (
          <button
            onClick={() => onViewShop(shopInfo._id)}
            className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View Shop
          </button>
        )}
      </div>
    </div>
  );
}

interface ShopRecommendationListProps {
  shops: ShopMatch[];
  title?: string;
  emptyMessage?: string;
  onViewShop?: (shopId: string) => void;
}

export function ShopRecommendationList({
  shops,
  title = 'आपके पास उपलब्ध पंजीकृत दुकानें',
  emptyMessage = 'आसपास कोई दुकान उपलब्ध नहीं है।',
  onViewShop,
}: ShopRecommendationListProps) {
  if (!shops || shops.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <XCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <div className="space-y-3">
        {shops.map((shop) => (
          <ShopRecommendationCard key={shop.shop._id} shop={shop} onViewShop={onViewShop} />
        ))}
      </div>
    </div>
  );
}
