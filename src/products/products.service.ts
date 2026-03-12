import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { MediaService } from '../media/media.service';
import { MediaPurpose } from '../common/enums/media-purpose.enum';
import { UpdateMediaOrderDto } from './dto/update-media-order.dto';

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

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name, 'products') private prodModel: Model<Product>,
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
      // THIS LOGS THE REAL REASON IN YOUR TERMINAL
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

      return await this.prodModel.findByIdAndUpdate(
        id,
        {
          $push: { 'media.gallery': imageUrl },
          ...(!product.media?.thumbnail
            ? { $set: { 'media.thumbnail': imageUrl } }
            : {}),
        },
        { new: true },
      );
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

      return await this.prodModel.findByIdAndUpdate(
        id,
        {
          $push: { 'media.gallery': imageUrl },
          ...(!product.media?.thumbnail
            ? { $set: { 'media.thumbnail': imageUrl } }
            : {}),
        },
        { new: true },
      );
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
    const result = stats[0] as StatsAggregationResult | undefined;
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

  async getProductDetail(shortId: string, lang: string) {
    const item = await this.prodModel.findOne({ shortId }).exec();
    if (!item) throw new NotFoundException('Product not found');
    return this.transformToDetail(item, lang);
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
    const unitMap: Record<string, { c: string; g: string }> = {
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
    const unitMap: Record<string, { c: string; g: string }> = {
      en: { c: 'Cup', g: 'Glass' },
      bn: { c: 'কাপ', g: 'গ্লাস' },
    };
    const t_unit = unitMap[lang] || unitMap['en'];
    return {
      shortId: item.shortId,
      title: item.title[lang] || item.title['en'] || '',
      description: item.description[lang] || item.description['en'] || '',
      price: item.logistics.grandTotal,
      unit: item.logistics.uKey === 'c' ? t_unit.c : t_unit.g,
      media: item.media,
    };
  }
}
