import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UpdatePageDto } from './dto/update-page.dto';

@ApiTags('Pages & SEO')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get('registry/:lang')
  @ApiOperation({ summary: 'Public: Get unified site text, SEO, and assets' })
  getRegistry(@Param('lang') lang: string) {
    return this.pagesService.getRegistry(lang);
  }

  @Post()
  @ApiOperation({ summary: 'Admin: Add a new page record' })
  create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Admin: Update page data/SEO/Assets' })
  update(@Param('key') key: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(key, dto);
  }

  @Get('admin/raw')
  @ApiOperation({ summary: 'Admin: View all raw page documents' })
  getAll() {
    return this.pagesService.findAllRaw();
  }
  // src/pages/pages.controller.ts

  // --- PUBLIC ROUTE ---
  @Get('key/:lang/:key')
  @ApiOperation({
    summary: 'Public: Get one transformed page by key and language',
  })
  findOneByLang(@Param('lang') lang: string, @Param('key') key: string) {
    return this.pagesService.findOneTransformed(key, lang);
  }

  // --- ADMIN ROUTE ---
  @Get('admin/key/:key')
  @ApiOperation({ summary: 'Admin: Get one raw page document by key' })
  findOneRaw(@Param('key') key: string) {
    return this.pagesService.findOneRawByKey(key);
  }
  @Delete(':key')
  @ApiOperation({ summary: 'Admin: Remove a page' })
  remove(@Param('key') key: string) {
    return this.pagesService.remove(key);
  }
}
