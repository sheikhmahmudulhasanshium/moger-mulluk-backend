// src/announcements/announcements.controller.ts
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
import { AnnouncementLinkMediaDto } from './dto/link-media.dto';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @ApiOperation({ summary: 'Admin: Create a new announcement' })
  create(@Body() createAnnouncementDto: CreateAnnouncementDto) {
    return this.announcementsService.create(createAnnouncementDto);
  }

  @Get('feed/:lang')
  @ApiOperation({
    summary: 'Public: Get localized announcement feed (Paginated)',
  })
  getFeed(
    @Param('lang') lang: string,
    @Query('page') p?: string,
    @Query('cat') c?: string,
  ) {
    return this.announcementsService.getFeed(lang, p ? parseInt(p) : 1, 10, c);
  }

  @Get('top/:lang')
  @ApiOperation({ summary: 'Public: Get top priority announcements' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Default is 10',
  })
  getTop(@Param('lang') lang: string, @Query('limit') limit?: string) {
    const max = limit ? parseInt(limit) : 10;
    return this.announcementsService.getTopNews(lang, max);
  }

  @Patch(':id/media-link')
  @ApiOperation({ summary: 'Admin: Link external image URL as thumbnail' })
  linkMedia(@Param('id') id: string, @Body() dto: AnnouncementLinkMediaDto) {
    return this.announcementsService.linkMedia(id, dto.url);
  }

  @Patch(':id/media')
  @ApiOperation({ summary: 'Admin: Bulk upload media' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: { type: 'string', format: 'binary' },
        gallery: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'gallery', maxCount: 5 },
    ]),
  )
  uploadMedia(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    return this.announcementsService.uploadMedia(id, files);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get raw announcement by ID' })
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Update announcement details' })
  update(@Param('id') id: string, @Body() updateDto: UpdateAnnouncementDto) {
    return this.announcementsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Delete announcement' })
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
