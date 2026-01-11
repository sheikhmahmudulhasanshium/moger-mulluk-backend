import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({
    example: { en: 'Question?', bn: 'প্রশ্ন?' },
    description: 'Object containing translations. "en" is required.',
  })
  @IsObject()
  question: Record<string, string>;

  @ApiProperty({
    example: { en: 'Answer', bn: 'উত্তর' },
    description: 'Object containing translations. "en" is required.',
  })
  @IsObject()
  answer: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  hide?: boolean;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsString()
  @IsOptional()
  link?: string;
}
