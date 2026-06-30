import {
  IsString,
  IsArray,
  IsObject,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateOfferDto {
  @IsString() id: string;
  @IsString() type: string;
  @IsArray() @IsString({ each: true }) productIds: string[];

  @IsObject() title: Record<string, string>;
  @IsObject() description: Record<string, string>;
  @IsObject() discount: Record<string, string>;
  @IsNumber() discountValue: number; // Added for numeric sorting

  @IsObject() conditions: Record<string, string>;

  @IsOptional() @IsObject() media?: { image: string };

  @IsObject() style: {
    background: string;
    textColor: string;
    accentColor: string;
    tagBackground: string;
  };

  @IsDateString() validFrom: string;
  @IsDateString() validUntil: string;

  @IsNumber() position: number;
  @IsBoolean() hide: boolean;

  @IsOptional() @IsString() promoCode?: string;
}
