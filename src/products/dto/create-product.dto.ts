import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shortId?: string; // Optional: System will generate if empty

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  position: number;

  @ApiProperty({ enum: ['tea', 'coffee', 'beverage', 'desert', 'snacks'] })
  @IsEnum(['tea', 'coffee', 'beverage', 'desert', 'snacks'])
  category: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsObject()
  title: Record<string, string>;

  @IsObject()
  description: Record<string, string>;

  @IsOptional()
  @IsObject()
  ingredients?: Record<string, string>;

  @IsOptional()
  @IsObject()
  healthBenefit?: Record<string, string>;

  @IsOptional()
  @IsObject()
  origin?: Record<string, string>;

  @IsOptional()
  @IsObject()
  funFact?: Record<string, string>;

  @IsObject()
  logistics: {
    stock: number;
    isAvailable: boolean;
    grandTotal: number;
    uKey: string;
    calories: number;
  };

  @IsOptional()
  @IsObject()
  media?: {
    thumbnail: string;
    gallery: string[];
  };
}
