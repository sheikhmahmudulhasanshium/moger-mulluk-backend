import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMediaOrderDto {
  @ApiProperty({ description: 'The URL that should become the thumbnail' })
  @IsString()
  thumbnail: string;

  @ApiProperty({
    description: 'The list of URLs in the desired serial order',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  gallery: string[];
}
