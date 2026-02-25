import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, IsNotEmpty, IsString } from 'class-validator';

export class LinkMediaDto {
  @ApiProperty({
    description: 'The external image URL to link as product thumbnail',
    example: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
  })
  @IsUrl()
  @IsNotEmpty()
  @IsString()
  url: string;
}
