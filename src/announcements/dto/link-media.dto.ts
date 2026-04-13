// src/announcements/dto/link-media.dto.ts
import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnnouncementLinkMediaDto {
  // RENAME THIS
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  url: string;
}
