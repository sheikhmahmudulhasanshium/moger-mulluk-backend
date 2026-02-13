import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MediaPurpose } from '../common/enums/media-purpose.enum';

@Schema({ timestamps: true })
export class Media extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true, unique: true })
  publicId: string;

  @Prop({ required: true })
  format: string;

  @Prop({ required: true })
  resourceType: string;

  @Prop({ type: Number, default: 0 })
  width: number;

  @Prop({ type: Number, default: 0 })
  height: number;

  @Prop({ type: Number, default: 0 })
  aspectRatio: number;

  @Prop({ type: Number, default: 0 })
  bytes: number;

  @Prop({
    type: String,
    enum: Object.values(MediaPurpose),
    default: MediaPurpose.GENERAL,
  })
  purpose: MediaPurpose;

  // New field to link to Product ID, Employee ID, etc.
  @Prop({ index: true })
  refId?: string;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
