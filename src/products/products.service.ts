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

interface ProductCardProjection {
  shortId: string;
  category: string;
  tags: string[];
  title: Record<string, string>;
  logistics: { grandTotal: number; uKey: string };
  media?: { thumbnail: string };
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name, 'products') private prodModel: Model<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    if (!dto.title?.en || !dto.description?.en) {
      throw new BadRequestException(
        'English (en) Title and Description are required',
      );
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

  // --- PUBLIC METHODS WITH PAGINATION ---

  async getMenuCards(lang: string, page = 1, limit = 10, category?: string) {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = { 'logistics.isAvailable': true };
    if (category) query.category = category;

    // Execute count and find in parallel for speed
    const [totalItems, items] = await Promise.all([
      this.prodModel.countDocuments(query),
      this.prodModel
        .find(query)
        .select(
          'shortId category tags title logistics.grandTotal logistics.uKey media.thumbnail',
        )
        .sort({ position: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const transformedItems = (items as unknown as ProductCardProjection[]).map(
      (item) => this.transformToCard(item, lang),
    );

    return {
      data: transformedItems,
      meta: {
        totalItems,
        itemCount: transformedItems.length,
        itemsPerPage: limit,
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

  // --- ADMIN METHODS WITH PAGINATION ---

  async findAllRaw(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [totalItems, items] = await Promise.all([
      this.prodModel.countDocuments(),
      this.prodModel
        .find()
        .sort({ position: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    return {
      data: items,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  // --- STATS & CRUD ---

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

    const result = stats[0] as {
      totalCount: { count: number }[];
      byCategory: { _id: string; count: number }[];
      availableCount: { count: number }[];
    };

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

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
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
    const unitMap: Record<string, { c: string; g: string }> = {
      en: { c: 'Cup', g: 'Glass' },
      bn: { c: 'কাপ', g: 'গ্লাস' },
    };
    const t_unit = unitMap[lang] || unitMap['en'];

    return {
      shortId: item.shortId,
      category: item.category,
      tags: item.tags,
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

    const title = item.title;
    const desc = item.description;
    const ingredients = item.ingredients || {};
    const benefit = item.healthBenefit || {};
    const origin = item.origin || {};
    const fact = item.funFact || {};

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
        ingredients: ingredients[lang] || ingredients['en'] || '',
        benefit: benefit[lang] || benefit['en'] || '',
        origin: origin[lang] || origin['en'] || '',
        fact: fact[lang] || fact['en'] || '',
      },
      stockStatus: item.logistics.stock > 0 ? 'In Stock' : 'Out of Stock',
      updatedAt: item.updatedAt,
    };
  }
}
