import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { nanoid } from 'nanoid';
import { Media } from './media.schema';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { MediaPurpose } from '../common/enums/media-purpose.enum';
import { UploadApiResponse } from 'cloudinary';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(Media.name, 'metadata') private mediaModel: Model<Media>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async saveMetadata(
    res: UploadApiResponse,
    originalName: string,
    purpose: MediaPurpose,
    refId?: string, // Added refId
  ): Promise<Media> {
    const newMedia = new this.mediaModel({
      name: originalName,
      url: res.secure_url,
      publicId: res.public_id,
      format: res.format,
      resourceType: res.resource_type,
      width: res.width || 0,
      height: res.height || 0,
      aspectRatio: res.height > 0 ? res.width / res.height : 0,
      bytes: res.bytes,
      purpose: purpose,
      refId: refId, // Save the reference
    });
    return await newMedia.save();
  }

  async uploadFile(
    file: Express.Multer.File,
    purpose: MediaPurpose,
    refId?: string, // Added refId
  ): Promise<Media> {
    const customId = `${purpose}-${nanoid(6)}`;
    const res = await this.cloudinaryService.uploadBuffer(file, customId);
    return this.saveMetadata(res, file.originalname, purpose, refId);
  }

  async uploadRemote(
    url: string,
    purpose: MediaPurpose,
    name?: string,
    refId?: string, // Added refId
  ): Promise<Media> {
    const customId = `${purpose}-${nanoid(6)}`;
    const res = await this.cloudinaryService.uploadString(url, customId);
    return this.saveMetadata(res, name || `remote-${customId}`, purpose, refId);
  }

  // New method to find by ProductID / EmployeeID
  async findByRefId(refId: string): Promise<Media[]> {
    return await this.mediaModel.find({ refId }).sort({ createdAt: -1 }).exec();
  }

  async findAll(page: number, limit: number, purpose?: MediaPurpose) {
    const filter = purpose ? { purpose } : {};
    const skip = (Math.max(1, page) - 1) * limit;

    const [data, total] = await Promise.all([
      this.mediaModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.mediaModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllRaw(purpose?: MediaPurpose): Promise<Media[]> {
    return await this.mediaModel
      .find(purpose ? { purpose } : {})
      .sort({ createdAt: -1 })
      .exec();
  }

  async getCount(purpose?: MediaPurpose) {
    const count = await this.mediaModel.countDocuments(
      purpose ? { purpose } : {},
    );
    return { count, purpose: purpose || 'all' };
  }

  async findById(id: string): Promise<Media> {
    const media = await this.mediaModel.findById(id);
    if (!media) throw new NotFoundException('Media record not found');
    return media;
  }

  async delete(id: string): Promise<Media | null> {
    const media = await this.findById(id);
    await this.cloudinaryService.deleteFile(media.publicId);
    return await this.mediaModel.findByIdAndDelete(id);
  }
}
