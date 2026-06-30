import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Offer } from './schemas/offer.schema';
import { OfferQueryDto } from './dto/offer-query.dto';
import {
  IRawOffer,
  OfferWithInheritedMedia,
} from './interfaces/offer-types.interfaces';
import { OfferSeederService } from './offer-seeder.service';
import { Product } from '../products/schemas/product.schema';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

interface OfferStatsResult {
  total: { c: number }[];
  typeBreakdown: { _id: string; c: number }[];
}

@Injectable()
export class OffersService {
  constructor(
    @InjectModel(Offer.name, 'products') private offerModel: Model<Offer>,
    @InjectModel(Product.name, 'products') private productModel: Model<Product>,
  ) {}

  /**
   * Helper to convert shortIds (strings) into MongoDB ObjectIds
   */
  private async resolveProductIds(
    shortIds: string[],
  ): Promise<Types.ObjectId[]> {
    const products = await this.productModel
      .find({ shortId: { $in: shortIds } })
      .select('_id')
      .exec();
    return products.map((p) => new Types.ObjectId(p._id.toString()));
  }

  private getSortValues(query: OfferQueryDto): { [key: string]: 1 | -1 } {
    const field =
      query.sortBy === 'title' ? 'title.en' : query.sortBy || 'position';
    const order = query.sortOrder === 'desc' ? -1 : 1;
    return { [field]: order };
  }

  async create(dto: CreateOfferDto): Promise<Offer> {
    const productObjectIds = await this.resolveProductIds(dto.productIds);
    const newOffer = new this.offerModel({
      ...dto,
      productIds: productObjectIds,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
    });
    return await newOffer.save();
  }

  async update(id: string, dto: UpdateOfferDto): Promise<Offer> {
    const updateData: Record<string, any> = { ...dto };

    if (dto.productIds) {
      updateData.productIds = await this.resolveProductIds(dto.productIds);
    }
    if (dto.validFrom) updateData.validFrom = new Date(dto.validFrom);
    if (dto.validUntil) updateData.validUntil = new Date(dto.validUntil);

    const updated = await this.offerModel
      .findOneAndUpdate({ id }, { $set: updateData }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException(`Offer ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.offerModel.deleteOne({ id }).exec();
    if (result.deletedCount === 0)
      throw new NotFoundException(`Offer ${id} not found`);
    return { deleted: true };
  }

  async getAllRaw(query: OfferQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const data = await this.offerModel
      .find()
      .sort(this.getSortValues(query))
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.offerModel.countDocuments();
    return { data, meta: { total, page, limit } };
  }

  async findByPromo(code: string): Promise<Offer> {
    const offer = await this.offerModel
      .findOne({ promoCode: code, hide: false })
      .exec();
    if (!offer) throw new NotFoundException('Invalid Promo Code');
    return offer;
  }

  async findByType(type: string, query: OfferQueryDto): Promise<Offer[]> {
    return this.offerModel
      .find({ type, hide: false })
      .sort(this.getSortValues(query))
      .limit(query.limit ?? 10)
      .exec();
  }

  async getRecent(query: OfferQueryDto): Promise<OfferWithInheritedMedia[]> {
    const now = new Date();
    const sortStage: PipelineStage.Sort = { $sort: this.getSortValues(query) };

    return this.offerModel
      .aggregate<OfferWithInheritedMedia>([
        {
          $match: {
            validFrom: { $lte: now },
            validUntil: { $gte: now },
            hide: false,
          },
        },
        {
          $lookup: {
            from: 'menu',
            localField: 'productIds',
            foreignField: '_id',
            as: 'product_details',
          },
        },
        {
          $addFields: {
            displayImage: {
              $ifNull: [
                '$media.image',
                { $arrayElemAt: ['$product_details.media.thumbnail', 0] },
              ],
            },
          },
        },
        sortStage,
      ])
      .exec();
  }

  async getArchived(query: OfferQueryDto): Promise<Offer[]> {
    return this.offerModel
      .find({ validUntil: { $lt: new Date() } })
      .sort(this.getSortValues(query))
      .exec();
  }

  async getUpcoming(query: OfferQueryDto): Promise<Offer[]> {
    return this.offerModel
      .find({ validFrom: { $gt: new Date() } })
      .sort(this.getSortValues(query))
      .exec();
  }

  async getOfferStats() {
    const stats = await this.offerModel
      .aggregate<OfferStatsResult>([
        {
          $facet: {
            total: [{ $count: 'c' }],
            typeBreakdown: [
              { $group: { _id: '$type', c: { $sum: 1 } } },
              { $sort: { c: -1 } },
            ],
          },
        },
      ])
      .exec();

    const result = stats[0];
    return {
      total: result?.total[0]?.c || 0,
      breakdown: result?.typeBreakdown || [],
      timestamp: new Date().toISOString(),
    };
  }

  async resetAndSeed(
    rawData: IRawOffer[],
    seeder: OfferSeederService,
  ): Promise<{ message: string }> {
    await this.offerModel.deleteMany({}).exec();
    return await seeder.seedOffers(rawData);
  }
}
