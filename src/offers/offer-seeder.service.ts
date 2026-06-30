// src/offers/offer-seeder.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Offer } from './schemas/offer.schema';
import { Product } from '../products/schemas/product.schema';
import { IRawOffer } from './interfaces/offer-types.interfaces';

@Injectable()
export class OfferSeederService {
  constructor(
    @InjectModel(Offer.name, 'products') private offerModel: Model<Offer>,
    @InjectModel(Product.name, 'products') private productModel: Model<Product>,
  ) {}

  /**
   * Seeds the offers collection.
   * Resolves shortIds to ObjectIds and ensures numeric fields are preserved.
   */
  async seedOffers(rawData: IRawOffer[]): Promise<{ message: string }> {
    for (let i = 0; i < rawData.length; i++) {
      const item: IRawOffer = rawData[i];

      // 1. Resolve shortIds to actual MongoDB _ids
      const products = await this.productModel
        .find({ shortId: { $in: item.productIds } })
        .select('_id')
        .exec();

      // 2. Safely map to ObjectIds (Fixes linting "Unsafe assignment" errors)
      const productObjectIds: Types.ObjectId[] = products.map(
        (p) => new Types.ObjectId(p._id.toString()),
      );

      // 3. Upsert into database using explicit mapping to avoid spread operator warnings
      await this.offerModel
        .updateOne(
          { id: item.id },
          {
            id: item.id,
            type: item.type,
            productIds: productObjectIds,
            title: item.title,
            description: item.description,
            discount: item.discount,
            discountValue: item.discountValue, // Maps the numeric value for sorting
            conditions: item.conditions,
            media: item.media,
            style: item.style,
            validFrom: new Date(item.validFrom),
            validUntil: new Date(item.validUntil),
            position: item.position,
            hide: item.hide,
            promoCode: item.promoCode,
          },
          { upsert: true },
        )
        .exec();
    }

    return { message: `Processed ${rawData.length} offers successfully` };
  }
}
