import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Language extends Document {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true, unique: true, lowercase: true })
  code: string;

  @Prop({ required: true, uppercase: true })
  CountryCode: string;
}

export const LanguageSchema = SchemaFactory.createForClass(Language);
