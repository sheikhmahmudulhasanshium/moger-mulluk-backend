// src/offers/schemas/offer.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
// src/offers/schemas/offer.schema.ts
@Schema({ timestamps: true, collection: 'offers' })
export class Offer extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  type: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], index: true })
  productIds: Types.ObjectId[];

  @Prop({ type: Object, required: true })
  title: Record<string, string>;

  @Prop({ type: Object, required: true })
  description: Record<string, string>;

  @Prop({ type: Object, required: true })
  discount: Record<string, string>;

  @Prop({ type: Number, default: 0, index: true })
  discountValue: number; // For numeric sorting/filtering

  @Prop({ type: Object, required: true })
  conditions: Record<string, string>;

  @Prop({ type: { image: String }, _id: false })
  media?: { image: string };

  @Prop({ type: Object })
  style: {
    background: string;
    textColor: string;
    accentColor: string;
    tagBackground: string;
  };

  @Prop({ required: true, index: true })
  validFrom: Date;

  @Prop({ required: true, index: true })
  validUntil: Date;

  @Prop({ default: 0 })
  position: number;

  @Prop({ default: false })
  hide: boolean;

  @Prop({ index: true, sparse: true })
  promoCode?: string;
}
export const OfferSchema = SchemaFactory.createForClass(Offer);
