import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { OfferSeederService } from './offer-seeder.service';
import {
  IRawOffer,
  OfferWithInheritedMedia,
} from './interfaces/offer-types.interfaces';
import { Offer } from './schemas/offer.schema';
import { OfferQueryDto } from './dto/offer-query.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Controller('offers')
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly seeder: OfferSeederService,
  ) {}

  @Post('reset-and-seed')
  async reset(@Body() data: IRawOffer[]): Promise<{ message: string }> {
    return await this.offersService.resetAndSeed(data, this.seeder);
  }

  @Post()
  async create(@Body() dto: CreateOfferDto): Promise<Offer> {
    return await this.offersService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ): Promise<Offer> {
    return await this.offersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return await this.offersService.remove(id);
  }

  @Get('raw')
  async getAllRaw(@Query() q: OfferQueryDto) {
    return await this.offersService.getAllRaw(q);
  }

  @Get('promo/:code')
  async getByPromo(@Param('code') code: string): Promise<Offer> {
    return await this.offersService.findByPromo(code);
  }

  @Get('type/:type')
  async getByType(
    @Param('type') type: string,
    @Query() q: OfferQueryDto,
  ): Promise<Offer[]> {
    return await this.offersService.findByType(type, q);
  }

  @Get('recent')
  async getRecent(
    @Query() q: OfferQueryDto,
  ): Promise<OfferWithInheritedMedia[]> {
    return await this.offersService.getRecent(q);
  }

  @Get('archived')
  async getArchived(@Query() q: OfferQueryDto): Promise<Offer[]> {
    return await this.offersService.getArchived(q);
  }

  @Get('upcoming')
  async getUpcoming(@Query() q: OfferQueryDto): Promise<Offer[]> {
    return await this.offersService.getUpcoming(q);
  }

  @Get('stats/count')
  async getCount() {
    return await this.offersService.getOfferStats();
  }
  // ... other routes (Get recent, Get raw, etc)

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<OfferWithInheritedMedia> {
    return await this.offersService.getByShortId(id);
  }
}
