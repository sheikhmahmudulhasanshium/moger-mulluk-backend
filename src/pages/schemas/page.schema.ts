import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'pages' })
export class Page extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ required: true })
  link: string;

  @Prop({ type: Object, required: true })
  title: Record<string, string>;

  @Prop({ type: Object, required: true })
  description: Record<string, string>;

  @Prop()
  icon: string;

  @Prop()
  videoUrl: string;

  @Prop({ type: Object })
  seo: {
    keywords: Record<string, string[]>;
    ogImage: string;
    isNoIndex: boolean;
  };

  @Prop({ type: Object })
  content: Record<string, Record<string, string>>;
}

export const PageSchema = SchemaFactory.createForClass(Page);
