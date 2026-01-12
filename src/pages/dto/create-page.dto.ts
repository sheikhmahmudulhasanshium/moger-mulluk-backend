import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SeoDto {
  @ApiProperty({ example: { en: ['tea'], bn: ['চা'] } })
  @IsObject()
  keywords: Record<string, string[]>;

  @ApiProperty({ example: 'https://cdn.moger-mulluk.com/og/home.jpg' })
  @IsString()
  @IsOptional()
  ogImage?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  isNoIndex?: boolean;
}

export class CreatePageDto {
  @ApiProperty({ example: 'home' })
  @IsString()
  @IsNotEmpty()
  key: string; // Internal identifier

  @ApiProperty({ example: '/' })
  @IsString()
  @IsNotEmpty()
  link: string;

  @ApiProperty({ example: { en: 'Home', bn: 'হোম' } })
  @IsObject()
  title: Record<string, string>;

  @ApiProperty({ example: { en: 'Description...', bn: 'বর্ণনা...' } })
  @IsObject()
  description: Record<string, string>;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;

  @ApiProperty({ description: 'Custom page-specific labels' })
  @IsOptional()
  @IsObject()
  content?: Record<string, Record<string, string>>;
}
