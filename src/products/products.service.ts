/// <reference types="multer" />
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery, Types } from 'mongoose';
import slugify from 'slugify';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { MediaService } from '../media/media.service';
import { MediaPurpose } from '../common/enums/media-purpose.enum';
import { UpdateMediaOrderDto } from './dto/update-media-order.dto';
import { Offer } from '../offers/schemas/offer.schema'; // Added Import

interface MediaResponse {
  url: string;
  secure_url?: string;
}

interface ProductCardProjection {
  shortId: string;
  category: string;
  tags: string[];
  title: Record<string, string>;
  logistics: { grandTotal: number; uKey: string };
  media?: { thumbnail: string };
}

interface StatsAggregationResult {
  total: { c: number }[];
  cat: { _id: string; c: number }[];
}

export interface CategoryGallery {
  _id: string;
  thumbnails: string[];
  count: number;
}

// Helper type to fix ESLint unsafe member access
type UnitMap = Record<string, { c: string; g: string }>;

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name, 'products') private prodModel: Model<Product>,
    @InjectModel(Offer.name, 'products') private offerModel: Model<Offer>, // Added Injection
    private mediaService: MediaService,
  ) {}

  async uploadProductMedia(
    id: string,
    files: {
      thumbnail?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    const product = await this.prodModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    const media = {
      thumbnail: product.media?.thumbnail || '',
      gallery: product.media?.gallery || [],
    };

    try {
      if (files.thumbnail?.length) {
        const savedMedia = (await this.mediaService.uploadFile(
          files.thumbnail[0],
          MediaPurpose.PRODUCT,
          id,
        )) as MediaResponse;
        media.thumbnail = savedMedia.secure_url || savedMedia.url;
      }

      if (files.gallery?.length) {
        const promises = files.gallery.map((f) =>
          this.mediaService.uploadFile(f, MediaPurpose.PRODUCT, id),
        );
        const results = (await Promise.all(promises)) as MediaResponse[];
        media.gallery.push(...results.map((r) => r.secure_url || r.url));
      }

      return await this.prodModel.findByIdAndUpdate(
        id,
        { $set: { media } },
        { new: true },
      );
    } catch (err: unknown) {
      // Fix: Check instance of Error to avoid unsafe .message access
      const msg = err instanceof Error ? err.message : 'File upload failed';
      this.logger.error(`Upload Error: ${msg}`);
      throw new BadRequestException(msg);
    }
  }

  async linkProductMedia(id: string, url: string) {
    const product = await this.prodModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    try {
      const savedMedia = (await this.mediaService.uploadRemote(
        url,
        MediaPurpose.PRODUCT,
        `thumb-${product.shortId}`,
        id,
      )) as MediaResponse;

      const imageUrl = savedMedia.secure_url || savedMedia.url;
      if (!imageUrl) throw new Error('Cloudinary did not return a URL');

      return await this.prodModel.findByIdAndUpdate(
        id,
        { $set: { 'media.thumbnail': imageUrl } },
        { new: true },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Remote upload failed';
      this.logger.error(`Link Failure for ${url}: ${msg}`);
      throw new BadRequestException(`Image Link Failed: ${msg}`);
    }
  }

  async addGalleryFile(id: string, file: Express.Multer.File) {
    const product = await this.prodModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    try {
      const savedMedia = (await this.mediaService.uploadFile(
        file,
        MediaPurpose.PRODUCT,
        id,
      )) as MediaResponse;

      const imageUrl = savedMedia.secure_url || savedMedia.url;
      const updatePayload: UpdateQuery<Product> = {
        $push: { 'media.gallery': imageUrl },
      };

      if (!product.media?.thumbnail) {
        updatePayload.$set = { 'media.thumbnail': imageUrl };
      }

      return await this.prodModel.findByIdAndUpdate(id, updatePayload, {
        new: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gallery upload failed';
      throw new BadRequestException(msg);
    }
  }

  async addGalleryLink(id: string, url: string) {
    const product = await this.prodModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    try {
      const savedMedia = (await this.mediaService.uploadRemote(
        url,
        MediaPurpose.PRODUCT,
        `gal-${Date.now()}-${product.shortId}`,
        id,
      )) as MediaResponse;

      const imageUrl = savedMedia.secure_url || savedMedia.url;
      const updatePayload: UpdateQuery<Product> = {
        $push: { 'media.gallery': imageUrl },
      };

      if (!product.media?.thumbnail) {
        updatePayload.$set = { 'media.thumbnail': imageUrl };
      }

      return await this.prodModel.findByIdAndUpdate(id, updatePayload, {
        new: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gallery link failed';
      throw new BadRequestException(msg);
    }
  }

  async updateMediaOrder(id: string, dto: UpdateMediaOrderDto) {
    return await this.prodModel.findByIdAndUpdate(
      id,
      {
        $set: {
          'media.thumbnail': dto.thumbnail,
          'media.gallery': dto.gallery,
        },
      },
      { new: true },
    );
  }

  async create(dto: CreateProductDto): Promise<Product> {
    if (!dto.title?.en) throw new BadRequestException('English title required');
    const slug = slugify(dto.title.en, { lower: true, strict: true });
    const shortId = `${dto.category}--${String(dto.position).padStart(2, '0')}--${slug}`;
    return await new this.prodModel({
      ...dto,
      shortId: dto.shortId || shortId,
    }).save();
  }

  async findOne(id: string) {
    return await this.prodModel.findById(id).exec();
  }

  async findAllRaw(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prodModel.countDocuments(),
      this.prodModel
        .find()
        .sort({ position: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);
    return { data, meta: { totalItems: total, currentPage: page } };
  }

  async getMenuCards(lang: string, page = 1, limit = 10, category?: string) {
    const skip = (page - 1) * limit;
    const query = {
      'logistics.isAvailable': true,
      ...(category ? { category } : {}),
    };
    // Fix: Explicitly cast result to solve unsafe mapping errors
    const items = (await this.prodModel
      .find(query)
      .select(
        'shortId category tags title logistics.grandTotal logistics.uKey media.thumbnail',
      )
      .sort({ position: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()) as unknown as ProductCardProjection[];
    const total = await this.prodModel.countDocuments(query);
    return {
      data: items.map((i) => this.transformToCard(i, lang)),
      meta: { totalItems: total, currentPage: page },
    };
  }

  async searchProducts(lang: string, dto: SearchQueryDto) {
    const p = dto.page || 1;
    const l = dto.limit || 10;
    const regex = { $regex: dto.q, $options: 'i' };
    const filter = {
      'logistics.isAvailable': true,
      ...(dto.cat ? { category: dto.cat } : {}),
      $or: [
        { 'title.en': regex },
        { 'title.bn': regex },
        { 'title.hi': regex },
        { 'title.es': regex },
        { tags: { $in: [new RegExp(dto.q, 'i')] } },
        { shortId: regex },
      ],
    };
    // Fix: Explicitly cast result
    const items = (await this.prodModel
      .find(filter)
      .select(
        'shortId category tags title logistics.grandTotal logistics.uKey media.thumbnail',
      )
      .sort({ position: 1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean()
      .exec()) as unknown as ProductCardProjection[];
    const total = await this.prodModel.countDocuments(filter);
    return {
      data: items.map((i) => this.transformToCard(i, lang)),
      meta: { totalItems: total, currentPage: p },
    };
  }

  async getProductStats() {
    const stats = await this.prodModel
      .aggregate<StatsAggregationResult>([
        {
          $facet: {
            total: [{ $count: 'c' }],
            cat: [{ $group: { _id: '$category', c: { $sum: 1 } } }],
          },
        },
      ])
      .exec();
    // Fix: Solved unsafe member access (.total, .cat) via typed Aggregation result
    const result = stats[0];
    return {
      total: result?.total[0]?.c || 0,
      breakdown: result?.cat || [],
      timestamp: new Date().toISOString(),
    };
  }

  async getProductGallery(): Promise<CategoryGallery[]> {
    return await this.prodModel
      .aggregate<CategoryGallery>([
        {
          $match: {
            'media.thumbnail': { $exists: true, $ne: '' },
            'logistics.isAvailable': true,
          },
        },
        {
          $group: {
            _id: '$category',
            thumbnails: { $push: '$media.thumbnail' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();
  }

  // Add to ProductsService: Identifies available offers for each product
  async findOffersByProduct(
    productId: string | Types.ObjectId,
  ): Promise<Offer[]> {
    const now = new Date();
    return this.offerModel
      .find({
        productIds: productId,
        hide: false,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
      })
      .exec();
  }

  async getProductDetail(shortId: string, lang: string) {
    const item = await this.prodModel.findOne({ shortId }).exec();
    if (!item) throw new NotFoundException('Product not found');

    // Fetch Many-to-Many offer links
    const activeOffers = await this.findOffersByProduct(item._id);

    return {
      ...this.transformToDetail(item, lang),
      availableOffers: activeOffers.map((o) => ({
        id: o.id,
        title: o.title[lang] || o.title['en'],
        discount: o.discount[lang] || o.discount['en'],
        promoCode: o.promoCode,
        type: o.type,
      })),
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    return await this.prodModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
  }

  async remove(id: string) {
    return await this.prodModel.findByIdAndDelete(id).exec();
  }

  private transformToCard(item: ProductCardProjection, lang: string) {
    // Fix: Typed unitMap to solve unsafe member access
    const unitMap: UnitMap = {
      en: { c: 'Cup', g: 'Glass' },
      bn: { c: 'কাপ', g: 'গ্লাস' },
    };
    const t_unit = unitMap[lang] || unitMap['en'];
    return {
      shortId: item.shortId,
      category: item.category,
      title: item.title[lang] || item.title['en'] || '',
      price: item.logistics.grandTotal,
      unit: item.logistics.uKey === 'c' ? t_unit.c : t_unit.g,
      thumbnail: item.media?.thumbnail || '',
    };
  }

  private transformToDetail(item: Product, lang: string) {
    const unitMap: UnitMap = {
      en: { c: 'Cup', g: 'Glass' },
      bn: { c: 'কাপ', g: 'গ্লাস' },
    };
    const t_unit = unitMap[lang] || unitMap['en'];
    return {
      id: String(item._id), // Fix: Solved TS2352 conversion error
      shortId: item.shortId,
      title: item.title[lang] || item.title['en'] || '',
      description: item.description[lang] || item.description['en'] || '',
      price: item.logistics.grandTotal,
      unit: item.logistics.uKey === 'c' ? t_unit.c : t_unit.g,
      media: item.media,
    };
  }

  // New logic: Find products by Offer ID
  async findProductsByOffer(offerId: string): Promise<Product[]> {
    const offer = await this.offerModel.findById(offerId).exec();
    if (!offer) throw new NotFoundException('Offer not found');

    return this.prodModel
      .find({
        _id: { $in: offer.productIds },
      })
      .exec();
  }
}
