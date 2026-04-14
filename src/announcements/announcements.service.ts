import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Announcement } from './schemas/announcement.schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { MediaService } from '../media/media.service';
import { MediaPurpose } from '../common/enums/media-purpose.enum';
import { Media } from '../media/media.schema';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(Announcement.name, 'metadata')
    private model: Model<Announcement>,
    @InjectModel(Media.name, 'metadata') private mediaModel: Model<Media>,
    private mediaService: MediaService,
  ) {}

  async create(dto: CreateAnnouncementDto): Promise<Announcement> {
    if (!dto.title?.en)
      throw new BadRequestException('English title is required');
    return await new this.model(dto).save();
  }

  async findAllRaw(): Promise<Announcement[]> {
    return (await this.model
      .find()
      .sort({ priority: -1, createdAt: -1 })
      .lean()
      .exec()) as Announcement[];
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
      data: (items as unknown as Announcement[]).map((i) =>
        this.transform(i, lang),
      ),
      meta: { total, page, limit },
    };
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const updated = await this.model
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Announcement not found');
    return updated;
  }

  async uploadMedia(
    id: string,
    files: {
      thumbnail?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ): Promise<Announcement> {
    const ann = await this.model.findById(id);
    if (!ann) throw new NotFoundException();

    if (files.thumbnail?.length) {
      if (ann.media.thumbnail)
        await this.cleanupMediaByUrl(ann.media.thumbnail);
      const res = await this.mediaService.uploadFile(
        files.thumbnail[0],
        MediaPurpose.ANNOUNCEMENT,
        id,
      );
      ann.media.thumbnail = res.url;
    }

    if (files.gallery?.length) {
      const results = await Promise.all(
        files.gallery.map((f) =>
          this.mediaService.uploadFile(f, MediaPurpose.ANNOUNCEMENT, id),
        ),
      );
      ann.media.gallery.push(...results.map((r) => r.url));
    }

    return await ann.save();
  }

  async remove(id: string) {
    const ann = await this.model.findById(id);
    if (!ann) throw new NotFoundException();

    if (ann.media.thumbnail) await this.cleanupMediaByUrl(ann.media.thumbnail);
    await Promise.all(
      ann.media.gallery.map((url) => this.cleanupMediaByUrl(url)),
    );

    return await this.model.findByIdAndDelete(id).exec();
  }

  private async cleanupMediaByUrl(url: string): Promise<void> {
    try {
      const mediaRecord = await this.mediaModel.findOne({ url }).exec();
      if (mediaRecord) {
        await this.mediaService.delete(mediaRecord._id.toString());
      }
    } catch {
      this.logger.error(`Cleanup failed for: ${url}`);
    }
  }

  private transform(item: Announcement, lang: string) {
    const getL = (f: Record<string, string> | undefined) =>
      f ? f[lang] || f['en'] || '' : '';

    return {
      id: item._id.toString(),
      category: item.category,
      title: getL(item.title),
      subtitle: getL(item.subtitle),
      shortDescription: getL(item.shortDescription),
      longDescription: getL(item.longDescription),
      media: item.media,
      attachments: item.attachments || { pdfs: [], externalUrls: [] },
      createdAt: item.createdAt,
    };
  }
}
