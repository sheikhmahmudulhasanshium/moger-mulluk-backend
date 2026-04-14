import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Object, required: true })
  title: Record<string, string>;

  @Prop({ type: Object })
  subtitle: Record<string, string>;

  @Prop({ type: Object })
  shortDescription: Record<string, string>;

  @Prop({ type: Object })
  longDescription: Record<string, string>;

  @Prop({
    type: {
      thumbnail: { type: String, default: '' },
      gallery: { type: [String], default: [] },
    },
    _id: false,
    default: { thumbnail: '', gallery: [] },
  })
  media: {
    thumbnail: string;
    gallery: string[];
  };

  @Prop({
    type: {
      pdfs: { type: [String], default: [] },
      externalUrls: { type: [String], default: [] },
    },
    _id: false,
    default: { pdfs: [], externalUrls: [] },
  })
  attachments: {
    pdfs: string[];
    externalUrls: string[];
  };

  @Prop({ default: 0, index: true })
  priority: number;

  @Prop({ default: true, index: true })
  isAvailable: boolean;

  @Prop({ required: true, index: true })
  category: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
