import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import {
  Announcement,
  AnnouncementSchema,
} from './schemas/announcement.schema';
import { Media, MediaSchema } from '../media/media.schema';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Announcement.name, schema: AnnouncementSchema },
        { name: Media.name, schema: MediaSchema }, // Added this for cleanup logic
      ],
      'metadata',
    ),
    MediaModule,
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
