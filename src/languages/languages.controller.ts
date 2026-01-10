import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Languages')
@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new language' })
  create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languagesService.create(createLanguageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all languages' })
  findAll() {
    return this.languagesService.findAll();
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get language by ISO code (e.g. bn)' })
  findByCode(@Param('code') code: string) {
    return this.languagesService.findByCode(code);
  }

  @Get('country/:countryCode')
  @ApiOperation({ summary: 'Get languages by Country Code (e.g. BD)' })
  findByCountry(@Param('countryCode') countryCode: string) {
    return this.languagesService.findByCountry(countryCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get language by MongoDB ID' })
  findOne(@Param('id') id: string) {
    return this.languagesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update language by ID' })
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateLanguageDto>,
  ) {
    return this.languagesService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete language by ID' })
  remove(@Param('id') id: string) {
    return this.languagesService.remove(id);
  }
}
