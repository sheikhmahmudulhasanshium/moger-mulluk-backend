import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'menu' })
export class Product extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  shortId: string; // e.g., 'tea--01--plain-tea'

  @Prop({ default: 0, index: true })
  position: number;

  @Prop({
    required: true,
    enum: ['tea', 'coffee', 'beverage', 'desert', 'snacks'],
    index: true,
  })
  category: string;

  @Prop({ type: [String], index: true })
  tags: string[];

  @Prop({ type: Object, required: true })
  title: Record<string, string>;

  @Prop({ type: Object, required: true })
  description: Record<string, string>;

  @Prop({ type: Object })
  ingredients: Record<string, string>;

  @Prop({ type: Object })
  healthBenefit: Record<string, string>;

  @Prop({ type: Object })
  origin: Record<string, string>;

  @Prop({ type: Object })
  funFact: Record<string, string>;

  @Prop({
    type: Object,
    required: true,
  })
  logistics: {
    stock: number;
    isAvailable: boolean;
    grandTotal: number;
    uKey: string; // c=Cup, g=Glass
    calories: number;
  };

  @Prop({ type: Object })
  media: {
    thumbnail: string;
    gallery: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
