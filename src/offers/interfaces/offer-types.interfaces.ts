// src/offers/interfaces/offer-types.interfaces.ts
import { Types } from 'mongoose';

export interface IRawOffer {
  id: string;
  type: string;
  productIds: string[];
  title: Record<string, string>;
  description: Record<string, string>;
  discount: Record<string, string>;
  discountValue: number; // Added
  conditions: Record<string, string>;
  media?: { image: string };
  style: {
    background: string;
    textColor: string;
    accentColor: string;
    tagBackground: string;
  };
  validFrom: string;
  validUntil: string;
  position: number;
  hide: boolean;
  promoCode?: string;
}

export interface OfferWithInheritedMedia {
  _id: Types.ObjectId;
  id: string;
  displayImage: string;
  product_details?: any[];
  // ... other fields as defined in your schema
}
