import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import {
  Announcement,
  AnnouncementSchema,
} from './schemas/announcement.schema';
import { MediaModule } from '../media/media.module'; // Relative path
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module'; // Relative path

@Module({
  imports: [
    // Ensure this is on the correct connection.
    // If it belongs in 'metadata', add 'metadata' as the second argument:
    MongooseModule.forFeature(
      [{ name: Announcement.name, schema: AnnouncementSchema }],
      'metadata', // <--- Change this if announcements are in the metadata DB
    ),
    CloudinaryModule,
    MediaModule,
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
