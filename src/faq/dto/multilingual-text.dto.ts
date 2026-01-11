import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class MultilingualTextDto {
  @ApiProperty({
    example: 'How are you?',
    description: 'Mandatory English text',
  })
  @IsString()
  @IsNotEmpty()
  en: string;

  [key: string]: string;
}
