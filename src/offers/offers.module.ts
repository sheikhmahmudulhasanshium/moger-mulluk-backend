// src/offers/offers.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { Offer, OfferSchema } from './schemas/offer.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema'; // Import Product
import { OfferSeederService } from './offer-seeder.service';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Offer.name, schema: OfferSchema },
        { name: Product.name, schema: ProductSchema }, // Add Product for Seeder lookup
      ],
      'products', // Match the connection name in ProductsModule
    ),
  ],
  controllers: [OffersController],
  providers: [OffersService, OfferSeederService],
})
export class OffersModule {}
