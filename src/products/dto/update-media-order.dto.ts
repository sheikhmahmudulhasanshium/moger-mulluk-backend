import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMediaOrderDto {
  @ApiProperty({ description: 'The URL to set as thumbnail' })
  @IsString()
  thumbnail: string;

  @ApiProperty({
    description: 'The list of URLs for the gallery in order',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  gallery: string[];
}
