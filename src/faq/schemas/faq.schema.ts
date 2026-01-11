import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Faq extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Object,
    required: true,
    validate: {
      validator: (v: Record<string, string>) => v && typeof v.en === 'string',
      message: 'English (en) translation is required for question',
    },
  })
  question: Record<string, string>;

  @Prop({
    type: Object,
    required: true,
    validate: {
      validator: (v: Record<string, string>) => v && typeof v.en === 'string',
      message: 'English (en) translation is required for answer',
    },
  })
  answer: Record<string, string>;

  @Prop({ default: false })
  hide: boolean;

  @Prop({ default: 0 })
  position: number;

  @Prop({ unique: true }) // Added shortId
  shortId: string;

  @Prop({ default: '' })
  link: string;

  createdAt: Date;
  updatedAt: Date;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
