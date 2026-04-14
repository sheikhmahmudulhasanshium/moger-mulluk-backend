import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: { en: 'Title', bn: 'শিরোনাম' } })
  @IsObject()
  title: Record<string, string>;

  @IsObject() @IsOptional() subtitle?: Record<string, string>;
  @IsObject() @IsOptional() shortDescription?: Record<string, string>;
  @IsObject() @IsOptional() longDescription?: Record<string, string>;
  @IsNumber() @IsOptional() priority?: number;
  @IsBoolean() @IsOptional() isAvailable?: boolean;
  @IsString() category: string;

  @IsObject()
  @IsOptional()
  attachments?: {
    pdfs?: string[];
    externalUrls?: string[];
  };
}
