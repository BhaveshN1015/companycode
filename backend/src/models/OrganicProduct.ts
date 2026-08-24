import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganicProduct extends Document {
  shopkeeperId: mongoose.Types.ObjectId;
  productName: string;
  brandName: string;
  category: string;
  productSubCategory: 'organic_manure' | 'bio_fertilizer' | 'bio_pesticide' | 'bio_fungicide' | 'compost' | 'vermicompost' | 'neem_product' | 'plant_growth_promoter' | 'soil_amendment' | 'other';
  cropType: string;
  variety: string;
  productImages: string[];
  quantity: number;
  unit: string;
  mrp: number;
  sellingPrice: number;
  description: string;
  usageInstructions: string;
  dosage: string;
  cropSuitability: string[];
  ingredients: string;
  manufacturingCompany: string;
  manufacturingDate?: Date;
  expiryDate?: Date;
  stockStatus: 'in_stock' | 'out_of_stock';
  aiScanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organicProductSchema = new Schema<IOrganicProduct>(
  {
    shopkeeperId: { type: Schema.Types.ObjectId, ref: 'ShopkeeperProfile', required: true, index: true },
    productName: { type: String, required: true, trim: true },
    brandName: { type: String, default: '' },
    category: { type: String, default: 'Organic' },
    productSubCategory: {
      type: String,
      enum: ['organic_manure', 'bio_fertilizer', 'bio_pesticide', 'bio_fungicide', 'compost', 'vermicompost', 'neem_product', 'plant_growth_promoter', 'soil_amendment', 'other'],
      default: 'organic_manure',
      index: true,
    },
    cropType: { type: String, default: '', trim: true, index: true },
    variety: { type: String, default: '' },
    productImages: [String],
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: 'kg' },
    mrp: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    usageInstructions: { type: String, default: '' },
    dosage: { type: String, default: '' },
    cropSuitability: [String],
    ingredients: { type: String, default: '' },
    manufacturingCompany: { type: String, default: '' },
    manufacturingDate: Date,
    expiryDate: Date,
    stockStatus: { type: String, enum: ['in_stock', 'out_of_stock'], default: 'in_stock', index: true },
    aiScanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

organicProductSchema.index({ shopkeeperId: 1, stockStatus: 1 });
organicProductSchema.index({ productName: 'text', brandName: 'text' });

export const OrganicProduct = mongoose.model<IOrganicProduct>('OrganicProduct', organicProductSchema);
