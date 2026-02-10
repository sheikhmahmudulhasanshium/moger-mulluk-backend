import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import { UpdateMediaOrderDto } from './dto/update-media-order.dto';

interface ProductCardProjection {
  shortId: string;
  category: string;
  tags: string[];
  title: Record<string, string>;
  logistics: { grandTotal: number; uKey: string };
  media?: { thumbnail: string };
}
interface StatsAggregationResult {
  totalCount: { count: number }[];
  byCategory: { _id: string; count: number }[];
  availableCount: { count: number }[];
}
interface UnitSet {
  c: string;
  g: string;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name, 'products') private prodModel: Model<Product>,
    private cloudinaryService: CloudinaryService,
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
    const mediaUpdate = {
      thumbnail: product.media?.thumbnail || '',
      gallery: product.media?.gallery || [],
    };
    if (files.thumbnail?.length) {
      const res = await this.cloudinaryService.uploadBuffer(
        files.thumbnail[0],
        `thumb_${product.shortId}_${Date.now()}`,
      );
      mediaUpdate.thumbnail = res.secure_url;
    }
    if (files.gallery?.length) {
      const promises = files.gallery.map((f, i) =>
        this.cloudinaryService.uploadBuffer(
          f,
          `gal_${product.shortId}_${Date.now()}_${i}`,
        ),
      );
      const results = await Promise.all(promises);
      mediaUpdate.gallery.push(...results.map((r) => r.secure_url));
    }
    return await this.prodModel.findByIdAndUpdate(
      id,
      { $set: { media: mediaUpdate } },
      { new: true },
    );
  }

  async updateMediaOrder(id: string, dto: UpdateMediaOrderDto) {
    const updated = await this.prodModel.findByIdAndUpdate(
      id,
      {
        $set: {
          'media.thumbnail': dto.thumbnail,
          'media.gallery': dto.gallery,
        },
      },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
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
    const totalItems = await this.prodModel.countDocuments(query);
    return {
      data: items.map((i) => this.transformToCard(i, lang)),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async searchProducts(lang: string, dto: SearchQueryDto) {
    const skip = (dto.page || 1 - 1) * (dto.limit || 10);
    const regex = { $regex: dto.q, $options: 'i' };
    const filter = {
      'logistics.isAvailable': true,
      ...(dto.cat ? { category: dto.cat } : {}),
      $or: [
        { 'title.en': regex },
        { 'title.bn': regex },
        { 'title.hi': regex },
        { 'title.es': regex },
        { 'description.en': regex },
        { 'description.bn': regex },
        { 'ingredients.en': regex },
        { 'ingredients.bn': regex },
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
      .skip(skip)
      .limit(dto.limit || 10)
      .lean()
      .exec()) as unknown as ProductCardProjection[];
    const totalItems = await this.prodModel.countDocuments(filter);
    return {
      data: items.map((i) => this.transformToCard(i, lang)),
      meta: { totalItems, currentPage: dto.page || 1 },
    };
  }

  async getProductDetail(shortId: string, lang: string) {
    const item = await this.prodModel.findOne({ shortId }).exec();
    if (!item) throw new NotFoundException('Product not found');
    return this.transformToDetail(item, lang);
  }

  async findOne(id: string) {
    const product = await this.prodModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findAllRaw(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [totalItems, data] = await Promise.all([
      this.prodModel.countDocuments(),
      this.prodModel
        .find()
        .sort({ position: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);
    return {
      data,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async getProductStats() {
    const stats = await this.prodModel
      .aggregate([
        {
          $facet: {
            totalCount: [{ $count: 'count' }],
            byCategory: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            availableCount: [
              { $match: { 'logistics.isAvailable': true } },
              { $count: 'count' },
            ],
          },
        },
      ])
      .exec();
    const result = stats[0] as unknown as StatsAggregationResult;
    return {
      total: result.totalCount[0]?.count || 0,
      available: result.availableCount[0]?.count || 0,
      breakdown: result.byCategory.map((i) => ({
        category: i._id,
        count: i.count,
      })),
      timestamp: new Date().toISOString(),
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
    const unitMap: Record<string, UnitSet> = {
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
    const unitMap: Record<string, UnitSet> = {
      en: { c: 'Cup', g: 'Glass' },
      bn: { c: 'কাপ', g: 'গ্লাস' },
    };
    const t_unit = unitMap[lang] || unitMap['en'];
    const title = item.title,
      desc = item.description;
    return {
      shortId: item.shortId,
      title: title[lang] || title['en'] || '',
      description: desc[lang] || desc['en'] || '',
      price: item.logistics.grandTotal,
      unit: item.logistics.uKey === 'c' ? t_unit.c : t_unit.g,
      media: item.media,
    };
  }
}
