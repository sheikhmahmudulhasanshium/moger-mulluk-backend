// src/announcements/announcements.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Announcement } from './schemas/announcement.schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { MediaService } from '../media/media.service';
import { MediaPurpose } from '../common/enums/media-purpose.enum';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name, 'metadata')
    private model: Model<Announcement>,
    private mediaService: MediaService,
  ) {}

  async create(dto: CreateAnnouncementDto): Promise<Announcement> {
    return await new this.model(dto).save();
  }

  async getFeed(lang: string, page = 1, limit = 10, category?: string) {
    const skip = (page - 1) * limit;
    const query = { isAvailable: true, ...(category ? { category } : {}) };

    const items = await this.model
      .find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const total = await this.model.countDocuments(query);

    return {
      data: items.map((i) =>
        this.transform(i as unknown as Announcement, lang),
      ),
      meta: { total, page, limit },
    };
  }

  async getTopNews(lang: string, limit = 10) {
    const items = await this.model
      .find({ isAvailable: true })
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return items.map((item) =>
      this.transform(item as unknown as Announcement, lang),
    );
  }

  async uploadMedia(
    id: string,
    files: {
      thumbnail?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    const ann = await this.model.findById(id);
    if (!ann) throw new NotFoundException('Announcement not found');

    const media = {
      thumbnail: ann.media?.thumbnail || '',
      gallery: ann.media?.gallery || [],
    };

    if (files.thumbnail?.length) {
      const res = await this.mediaService.uploadFile(
        files.thumbnail[0],
        MediaPurpose.ANNOUNCEMENT,
        id,
      );
      media.thumbnail = res.url;
    }

    if (files.gallery?.length) {
      const promises = files.gallery.map((f) =>
        this.mediaService.uploadFile(f, MediaPurpose.ANNOUNCEMENT, id),
      );
      const results = await Promise.all(promises);
      media.gallery.push(...results.map((r) => r.url));
    }

    return await this.model.findByIdAndUpdate(
      id,
      { $set: { media } },
      { new: true },
    );
  }

  async linkMedia(id: string, url: string) {
    const ann = await this.model.findById(id);
    if (!ann) throw new NotFoundException();

    try {
      const res = await this.mediaService.uploadRemote(
        url,
        MediaPurpose.ANNOUNCEMENT,
        `ann-${id}`,
        id,
      );
      return await this.model.findByIdAndUpdate(
        id,
        { $set: { 'media.thumbnail': res.url } },
        { new: true },
      );
    } catch {
      throw new BadRequestException('Remote link failed');
    }
  }

  async findOne(id: string) {
    const item = await this.model.findById(id).exec();
    if (!item) throw new NotFoundException();
    return item;
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    return await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async remove(id: string) {
    return await this.model.findByIdAndDelete(id).exec();
  }

  private transform(item: Announcement, lang: string) {
    const t = item.title;
    const st = item.subtitle || {};
    const sd = item.shortDescription || {};
    const ld = item.longDescription || {};

    return {
      id: item._id,
      category: item.category,
      title: t[lang] || t['en'] || '',
      subtitle: st[lang] || st['en'] || '',
      shortDescription: sd[lang] || sd['en'] || '',
      longDescription: ld[lang] || ld['en'] || '',
      media: item.media,
      externalUrls: item.externalUrls,
      pdfs: item.pdfs,
      priority: item.priority,
      createdAt: item.createdAt,
    };
  }
}
