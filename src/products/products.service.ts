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
    private cloudinaryService: CloudinaryService, // New Injection
  ) {}

  // --- NEW MEDIA UPLOAD METHOD ---
  async uploadProductMedia(
    id: string,
    files: {
      thumbnail?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    if (!files) {
      throw new BadRequestException(
        'No files were uploaded. Make sure to use multipart/form-data',
      );
    }

    const product = await this.prodModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    const mediaUpdate = {
      thumbnail: product.media?.thumbnail || '',
      gallery: product.media?.gallery || [],
    };

    // 1. Upload Thumbnail (Replace existing)
    if (files.thumbnail?.length) {
      const file = files.thumbnail[0];
      const publicId = `thumb_${product.shortId}_${Date.now()}`;
      const result = await this.cloudinaryService.uploadBuffer(file, publicId);
      mediaUpdate.thumbnail = result.secure_url;
    }

    // 2. Upload Gallery Images (Append to existing)
    if (files.gallery?.length) {
      const uploadPromises = files.gallery.map((file, index) => {
        const publicId = `gal_${product.shortId}_${Date.now()}_${index}`;
        return this.cloudinaryService.uploadBuffer(file, publicId);
      });

      const results = await Promise.all(uploadPromises);
      const urls = results.map((r) => r.secure_url);
      mediaUpdate.gallery.push(...urls);
    }

    // 3. Save to Database
    return await this.prodModel.findByIdAndUpdate(
      id,
      { $set: { media: mediaUpdate } },
      { new: true },
    );
  }

  // --- EXISTING METHODS (UNCHANGED) ---
  async create(dto: CreateProductDto): Promise<Product> {
    if (!dto.title?.en)
      throw new BadRequestException('English (en) Title is required');
    const slug = slugify(dto.title.en, { lower: true, strict: true });
    const paddedPos = String(dto.position).padStart(2, '0');
    const generatedShortId = `${dto.category}--${paddedPos}--${slug}`;
    const created = new this.prodModel({
      ...dto,
      shortId: dto.shortId || generatedShortId,
    });
    return await created.save();
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
    const filter = {
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
      .find(filter)
      .select(
        'shortId category tags title logistics.grandTotal logistics.uKey media.thumbnail',
      )
      .sort({ position: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()) as unknown as ProductCardProjection[];
    const totalItems = await this.prodModel.countDocuments(filter);
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
  // Inside ProductsService class
  async updateMediaOrder(id: string, dto: UpdateMediaOrderDto) {
    const product = await this.prodModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    // We update the media object with the new strings provided by the frontend
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

    return updated;
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

  private transformToCard(item: ProductCardProjection, lang: string) {
    const unitMap: Record<string, UnitSet> = {
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
    const unitMap: Record<string, UnitSet> = {
      en: { c: 'Cup', g: 'Glass' },
      bn: { c: 'কাপ', g: 'গ্লাস' },
    };
    const t_unit = unitMap[lang] || unitMap['en'];
    const title = item.title,
      desc = item.description,
      ing = item.ingredients || {},
      ben = item.healthBenefit || {},
      ori = item.origin || {},
      fac = item.funFact || {};
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
