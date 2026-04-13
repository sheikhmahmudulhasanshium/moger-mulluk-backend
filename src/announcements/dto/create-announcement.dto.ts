// src/announcements/dto/create-announcement.dto.ts
import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
} from 'class-validator';

export class CreateAnnouncementDto {
  @IsObject() title: Record<string, string>;
  @IsObject() @IsOptional() subtitle?: Record<string, string>;
  @IsObject() @IsOptional() shortDescription?: Record<string, string>;
  @IsObject() @IsOptional() longDescription?: Record<string, string>;
  @IsNumber() @IsOptional() priority?: number;
  @IsBoolean() @IsOptional() isAvailable?: boolean;
  @IsEnum(['notice', 'update', 'alert', 'directive', 'news']) category: string;
  @IsArray() @IsString({ each: true }) @IsOptional() externalUrls?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() pdfs?: string[];
}
