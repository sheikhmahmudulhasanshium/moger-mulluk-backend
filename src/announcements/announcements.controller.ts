import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

interface MulterFiles {
  thumbnail?: Express.Multer.File[];
  gallery?: Express.Multer.File[];
}

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @ApiOperation({ summary: 'Admin: Create a new announcement' })
  create(@Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(dto);
  }

  @Get('all/raw')
  @ApiOperation({ summary: 'Admin: Get all announcements (untransformed)' })
  findAllRaw() {
    return this.announcementsService.findAllRaw();
  }

  @Get('feed/:lang')
  @ApiOperation({ summary: 'Public: Localized announcement feed' })
  getFeed(
    @Param('lang') lang: string,
    @Query('page') p?: string,
    @Query('cat') c?: string,
  ) {
    return this.announcementsService.getFeed(lang, p ? parseInt(p) : 1, 10, c);
  }

  @Patch(':id/media')
  @ApiOperation({ summary: 'Admin: Upload thumbnail and gallery images' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'gallery', maxCount: 5 },
    ]),
  )
  uploadMedia(@Param('id') id: string, @UploadedFiles() files: MulterFiles) {
    return this.announcementsService.uploadMedia(id, files);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Update announcement details' })
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Delete announcement and cleanup media' })
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
