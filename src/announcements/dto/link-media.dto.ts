// src/announcements/dto/link-media.dto.ts
import { IsUrl } from 'class-validator';
export class LinkMediaDto {
  @IsUrl() url: string;
}
