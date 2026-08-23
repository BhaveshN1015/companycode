import mongoose, { Schema, Document } from 'mongoose';

export type CardStatus = 'active' | 'pending' | 'suspended';
export type LandUnit = 'acres' | 'hectares' | 'bigha';

export interface ILocationInfo {
  country: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  pincode: string;
  coordinates: { latitude: number; longitude: number };
}

export interface IOtherBusiness {
  hasOtherBusiness: boolean;
  businessType?: string;
  businessDetails?: string;
}

export interface IAgroudAnKisanCard extends Document {
  userId: string;
  cardNumber: string;
  cardStatus: CardStatus;
  fullName: string;
  fatherName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobileNumber?: string;
  personalIncome?: number;
  familyIncome?: number;
  location: ILocationInfo;
  agriculture: {
    totalLandArea: number;
    landUnit: LandUnit;
    farmingCategory: string;
    annualIncomeRange?: string;
  };
  otherBusiness: IOtherBusiness;
  isComplete: boolean;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LocationInfoSchema = new Schema<ILocationInfo>(
  {
    country: { type: String, default: 'India' },
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    tehsil: { type: String, default: '' },
    village: { type: String, default: '' },
    pincode: { type: String, default: '' },
    coordinates: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const AgricultureSchema = new Schema(
  {
    totalLandArea: { type: Number, default: 0 },
    landUnit: {
      type: String,
      enum: ['acres', 'hectares', 'bigha'],
      default: 'acres',
    } as any,
    farmingCategory: { type: String, default: '' },
    annualIncomeRange: { type: String, default: '' },
  },
  { _id: false }
);

const OtherBusinessSchema = new Schema(
  {
    hasOtherBusiness: { type: Boolean, default: false },
    businessType: { type: String, default: '' },
    businessDetails: { type: String, default: '' },
  },
  { _id: false }
);

const schema = new Schema<IAgroudAnKisanCard>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    cardNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    cardStatus: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'active',
    } as any,
    fullName: { type: String, required: true, trim: true },
    fatherName: { type: String, default: '' },
    gender: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    mobileNumber: { type: String, default: '' },
    personalIncome: { type: Number, default: 0 },
    familyIncome: { type: Number, default: 0 },
    location: { type: LocationInfoSchema, default: () => ({}) },
    agriculture: { type: AgricultureSchema, default: () => ({}) },
    otherBusiness: { type: OtherBusinessSchema, default: () => ({ hasOtherBusiness: false }) },
    isComplete: { type: Boolean, default: false },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AgroudAnKisanCard = mongoose.model<IAgroudAnKisanCard>(
  'AgroudAnKisanCard',
  schema
);
