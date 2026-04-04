/// <reference types="multer" />
import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { MediaPurpose } from '../common/enums/media-purpose.enum';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Media } from './media.schema';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-file')
  @ApiOperation({ summary: 'Upload a binary file (Image/Video)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'purpose'],
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: {
          type: 'string',
          enum: Object.values(MediaPurpose),
          default: MediaPurpose.GENERAL,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('purpose') purpose: MediaPurpose = MediaPurpose.GENERAL,
  ): Promise<Media> {
    if (!file) throw new BadRequestException('No file selected');
    return await this.mediaService.uploadFile(file, purpose);
  }

  @Post('upload-link')
  @ApiOperation({ summary: 'Upload via URL or Base64 String' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['url', 'purpose'],
      properties: {
        url: {
          type: 'string',
          example: 'https://example.com/image.jpg',
          description: 'HTTP URL or Base64 string',
        },
        purpose: {
          type: 'string',
          enum: Object.values(MediaPurpose),
          default: MediaPurpose.GENERAL,
        },
        name: {
          type: 'string',
          example: 'my-custom-name',
          description: 'Optional filename',
        },
      },
    },
  })
  async uploadLink(
    @Body('url') url: string,
    @Body('purpose') purpose: MediaPurpose = MediaPurpose.GENERAL,
    @Body('name') name?: string,
  ): Promise<Media> {
    if (!url) throw new BadRequestException('URL or Base64 is required');
    return await this.mediaService.uploadRemote(url, purpose, name);
  }

  @Get()
  @ApiOperation({ summary: 'Paginated list of media' })
  async getPaginated(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('purpose') purpose?: MediaPurpose,
  ) {
    return await this.mediaService.findAll(
      Number(page),
      Number(limit),
      purpose,
    );
  }

  @Get('raw')
  @ApiOperation({ summary: 'Get all records (No pagination)' })
  async getRaw(@Query('purpose') purpose?: MediaPurpose): Promise<Media[]> {
    return await this.mediaService.findAllRaw(purpose);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get total count' })
  async getCount(@Query('purpose') purpose?: MediaPurpose) {
    return await this.mediaService.getCount(purpose);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single record by ID' })
  async getById(@Param('id') id: string): Promise<Media> {
    return await this.mediaService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete from DB and Cloudinary' })
  async delete(@Param('id') id: string): Promise<Media | null> {
    return await this.mediaService.delete(id);
  }

  @Get('ref/:refId')
  @ApiOperation({
    summary:
      'Get all media associated with a specific entity (Product/Employee ID)',
  })
  async getByRef(@Param('refId') refId: string): Promise<Media[]> {
    return await this.mediaService.findByRefId(refId);
  }
}
