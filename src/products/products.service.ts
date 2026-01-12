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

// 1. Interface for lightweight card data
interface ProductCardProjection {
  shortId: string;
  category: string;
  tags: string[];
  title: Record<string, string>;
  logistics: { grandTotal: number; uKey: string };
  media?: { thumbnail: string };
}

// 2. Interface for MongoDB Aggregation Result (Stats)
interface StatsAggregationResult {
  totalCount: { count: number }[];
  byCategory: { _id: string; count: number }[];
  availableCount: { count: number }[];
}

// 3. Interface for Unit Translations
interface UnitSet {
  c: string;
  g: string;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name, 'products') private prodModel: Model<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    if (!dto.title?.en) {
      throw new BadRequestException('English (en) Title is required');
    }

    const slug = slugify(dto.title.en, { lower: true, strict: true });
    const paddedPos = String(dto.position).padStart(2, '0');
    const generatedShortId = `${dto.category}--${paddedPos}--${slug}`;

    const created = new this.prodModel({
      ...dto,
      shortId: dto.shortId || generatedShortId,
    });
    return await created.save();
  }

  // --- PUBLIC METHODS ---

  async getMenuCards(lang: string, page = 1, limit = 10, category?: string) {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {
      'logistics.isAvailable': true,
      ...(category ? { category } : {}),
    };

    const items = (await this.prodModel
      .find(query as unknown as Record<string, unknown>)
      .select(
        'shortId category tags title logistics.grandTotal logistics.uKey media.thumbnail',
      )
      .sort({ position: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()) as unknown as ProductCardProjection[];

    const totalItems = await this.prodModel.countDocuments(
      query as unknown as Record<string, unknown>,
    );

    return {
      data: items.map((item) => this.transformToCard(item, lang)),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async searchProducts(lang: string, queryDto: SearchQueryDto) {
    const { q, cat, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;
    const regex = { $regex: q, $options: 'i' };

    const filter: Record<string, unknown> = {
      'logistics.isAvailable': true,
      ...(cat ? { category: cat } : {}),
      $or: [
        { 'title.en': regex },
        { 'title.bn': regex },
        { 'title.hi': regex },
        { 'title.es': regex },
        { 'description.en': regex },
        { 'description.bn': regex },
        { 'ingredients.en': regex },
        { 'ingredients.bn': regex },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { shortId: regex },
      ],
    };

    const items = (await this.prodModel
      .find(filter as unknown as Record<string, unknown>)
      .select(
        'shortId category tags title logistics.grandTotal logistics.uKey media.thumbnail',
      )
      .sort({ position: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()) as unknown as ProductCardProjection[];

    const totalItems = await this.prodModel.countDocuments(
      filter as unknown as Record<string, unknown>,
    );

    return {
      data: items.map((item) => this.transformToCard(item, lang)),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async getProductDetail(shortId: string, lang: string) {
    const item = await this.prodModel.findOne({ shortId }).exec();
    if (!item) throw new NotFoundException('Product not found');
    return this.transformToDetail(item, lang);
  }

  // --- ADMIN & STATS ---

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

    // FIX: Double cast to handle MongoDB aggregation results safely
    const result = stats[0] as unknown as StatsAggregationResult;

    return {
      total: result.totalCount[0]?.count || 0,
      available: result.availableCount[0]?.count || 0,
      breakdown: result.byCategory.map((item) => ({
        category: item._id,
        count: item.count,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    const updated = await this.prodModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.prodModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Product not found');
    return { deleted: true };
  }

  // --- HELPERS ---

  private transformToCard(item: ProductCardProjection, lang: string) {
    const unitMap: Record<string, UnitSet> = {
      en: { c: 'Cup', g: 'Glass' },
      bn: { c: 'কাপ', g: 'গ্লাস' },
    };

    // Type-safe unit selection
    const t_unit = unitMap[lang] || unitMap['en'] || { c: 'Unit', g: 'Unit' };
    const title = item.title;

    return {
      shortId: item.shortId,
      category: item.category,
      tags: item.tags,
      title: title[lang] || title['en'] || '',
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
    const t_unit = unitMap[lang] || unitMap['en'] || { c: 'Unit', g: 'Unit' };

    // Explicit casting to Record for indexing safety
    const title = item.title;
    const desc = item.description;
    const ing = item.ingredients || {};
    const ben = item.healthBenefit || {};
    const ori = item.origin || {};
    const fac = item.funFact || {};

    return {
      shortId: item.shortId,
      category: item.category,
      tags: item.tags,
      title: title[lang] || title['en'] || '',
      description: desc[lang] || desc['en'] || '',
      price: item.logistics.grandTotal,
      unit: item.logistics.uKey === 'c' ? t_unit.c : t_unit.g,
      calories: `${item.logistics.calories} kcal`,
      media: item.media,
      details: {
        ingredients: ing[lang] || ing['en'] || '',
        benefit: ben[lang] || ben['en'] || '',
        origin: ori[lang] || ori['en'] || '',
        fact: fac[lang] || fac['en'] || '',
      },
      stockStatus: item.logistics.stock > 0 ? 'In Stock' : 'Out of Stock',
    };
  }
}
