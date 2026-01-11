import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { FaqService, TransformedFaq } from './faq.service'; // Import the interface here
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Faq } from './schemas/faq.schema';
@ApiTags('FAQ')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new FAQ' })
  create(@Body() createFaqDto: CreateFaqDto): Promise<Faq> {
    return this.faqService.create(createFaqDto);
  }

  @Get()
  findAll(): Promise<Faq[]> {
    return this.faqService.findAll();
  }

  // --- PUBLIC ENDPOINTS (Filtered by Language) ---

  @Get('lang/:lang')
  @ApiOperation({ summary: 'Get all FAQs by language' })
  findAllByLang(@Param('lang') lang: string): Promise<TransformedFaq[]> {
    return this.faqService.findAllByLang(lang);
  }

  @Get('lang/:lang/shortid/:shortId')
  @ApiOperation({ summary: 'Get FAQ by Language and Short ID' })
  findOneByLangByShortId(
    @Param('lang') lang: string,
    @Param('shortId') shortId: string,
  ): Promise<TransformedFaq> {
    return this.faqService.findOneByLangByShortId(lang, shortId);
  }

  @Get('lang/:lang/:id')
  @ApiOperation({ summary: 'Get FAQ by Language and MongoDB ID' })
  findOneByLang(
    @Param('id') id: string,
    @Param('lang') lang: string,
  ): Promise<TransformedFaq> {
    return this.faqService.findOneByLang(id, lang);
  }

  // --- ADMIN ENDPOINTS (Raw Documents) ---

  @Get('shortid/:shortId')
  @ApiOperation({ summary: 'Get Raw FAQ by Short ID' })
  findByShortId(@Param('shortId') shortId: string): Promise<Faq> {
    return this.faqService.findByShortId(shortId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Raw FAQ by MongoDB ID' })
  findOne(@Param('id') id: string): Promise<Faq> {
    return this.faqService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFaqDto: UpdateFaqDto,
  ): Promise<Faq> {
    return this.faqService.update(id, updateFaqDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
}
