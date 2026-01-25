import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { Media, MediaSchema } from './media.schema';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    CloudinaryModule,
    MongooseModule.forFeature(
      [{ name: Media.name, schema: MediaSchema }],
      'metadata',
    ),
  ],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
