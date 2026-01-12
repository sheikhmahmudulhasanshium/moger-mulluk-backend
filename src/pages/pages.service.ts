import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Page } from './schemas/page.schema';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PagesService {
  constructor(
    @InjectModel(Page.name, 'metadata') private pageModel: Model<Page>,
  ) {}

  /**
   * Public: Get transformed UI context for a specific language
   */
  async getRegistry(lang: string) {
    const data = await this.pageModel.find().lean().exec();
    const registry: Record<string, unknown> = {};

    data.forEach((item) => {
      const title = item.title || {};
      const desc = item.description || {};
      const keywords = item.seo?.keywords || {};

      registry[item.key] = {
        title: title[lang] || title['en'] || '',
        description: desc[lang] || desc['en'] || '',
        link: item.link,
        icon: item.icon || '',
        video: item.videoUrl || '',
        seo: {
          keywords: keywords[lang] || keywords['en'] || [],
          ogImage: item.seo?.ogImage || '',
          isNoIndex: item.seo?.isNoIndex || false,
        },
        ...this.extractLabels(item.content, lang),
      };
    });

    return registry;
  }

  private extractLabels(
    content: unknown,
    lang: string,
  ): Record<string, string> {
    if (!content || typeof content !== 'object') return {};
    const raw = content as Record<string, Record<string, string>>;
    const result: Record<string, string> = {};
    Object.keys(raw).forEach((k) => {
      result[k] = raw[k][lang] || raw[k]['en'] || '';
    });
    return result;
  }

  async create(dto: CreatePageDto): Promise<Page> {
    const exists = await this.pageModel.findOne({ key: dto.key }).exec();
    if (exists) throw new BadRequestException('Page key already exists');
    return await new this.pageModel(dto).save();
  }

  async update(key: string, dto: UpdatePageDto): Promise<Page> {
    const updated = await this.pageModel
      .findOneAndUpdate({ key }, { $set: dto }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Page not found');
    return updated;
  }

  async findAllRaw(): Promise<Page[]> {
    return await this.pageModel.find().exec();
  }
  // src/pages/pages.service.ts

  /**
   * Public: Find one page and transform it for a specific language
   */
  async findOneTransformed(key: string, lang: string) {
    const page = await this.pageModel.findOne({ key }).lean().exec();
    if (!page) throw new NotFoundException(`Page "${key}" not found`);

    const title = page.title || {};
    const desc = page.description || {};
    const keywords = page.seo?.keywords || {};

    return {
      key: page.key,
      title: title[lang] || title['en'] || '',
      description: desc[lang] || desc['en'] || '',
      link: page.link,
      icon: page.icon || '',
      video: page.videoUrl || '',
      seo: {
        keywords: keywords[lang] || keywords['en'] || [],
        ogImage: page.seo?.ogImage || '',
        isNoIndex: page.seo?.isNoIndex || false,
      },
      ...this.extractLabels(page.content, lang),
    };
  }

  /**
   * Admin: Find one raw page by key
   */
  async findOneRawByKey(key: string): Promise<Page> {
    const page = await this.pageModel.findOne({ key }).exec();
    if (!page) throw new NotFoundException(`Page "${key}" not found`);
    return page;
  }
  async remove(key: string) {
    const res = await this.pageModel.findOneAndDelete({ key }).exec();
    if (!res) throw new NotFoundException('Page not found');
    return { deleted: true };
  }
}
