import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsNotEmpty } from 'class-validator';

export class CreateLanguageDto {
  @ApiProperty({ example: 'বাংলা' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 'bn' })
  @IsString()
  @Length(2, 5)
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'BD' })
  @IsString()
  @Length(2, 2)
  @IsNotEmpty()
  CountryCode: string;
}
