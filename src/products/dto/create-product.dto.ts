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
  @IsString()
  @IsOptional()
  shortId?: string;

  @IsNumber()
  @IsNotEmpty()
  position: number;

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
