import { Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadBuffer(
    file: Express.Multer.File,
    publicId: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'moger_mulluk',
          public_id: publicId,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) return reject(new Error(String(error.message)));
          if (!result) return reject(new Error('Cloudinary result undefined'));
          resolve(result);
        },
      );
      void Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadString(
    path: string,
    publicId: string,
  ): Promise<UploadApiResponse> {
    try {
      return await cloudinary.uploader.upload(path, {
        resource_type: 'auto',
        folder: 'moger_mulluk',
        public_id: publicId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      throw new Error(message);
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      throw new Error(message);
    }
  }
}
