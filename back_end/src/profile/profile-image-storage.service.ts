import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

export interface UploadedFileLike {
  buffer?: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}

export interface StoredProfileImage {
  url: string;
  publicId?: string;
}

@Injectable()
export class ProfileImageStorageService {
  private readonly cloudinaryEnabled: boolean;

  constructor() {
    this.cloudinaryEnabled = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    );

    if (this.cloudinaryEnabled) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  async saveProfileImage(
    userId: string,
    file: UploadedFileLike,
    kind: 'avatar' | 'cover' | 'photo',
  ): Promise<StoredProfileImage> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }

    const extension = this.extensionFromMimeType(file.mimetype);

    if (this.cloudinaryEnabled) {
      return this.uploadToCloudinary(userId, file, kind);
    }

    const uploadDir = join(process.cwd(), 'uploads', 'profile', userId);
    const filename = `${randomUUID()}${extension}`;

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), file.buffer);

    return { url: `/uploads/profile/${userId}/${filename}` };
  }

  async saveReportEvidence(
    reporterId: string,
    reportedUserId: string,
    file: UploadedFileLike,
  ): Promise<StoredProfileImage> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }

    const extension = this.extensionFromEvidenceMimeType(file.mimetype);

    if (this.cloudinaryEnabled) {
      return this.uploadToCloudinary(
        `reports/${reporterId}/${reportedUserId}`,
        file,
        'evidence',
        'auto',
      );
    }

    const uploadDir = join(process.cwd(), 'uploads', 'reports', reporterId, reportedUserId);
    const filename = `${randomUUID()}${extension}`;

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), file.buffer);

    return { url: `/uploads/reports/${reporterId}/${reportedUserId}/${filename}` };
  }

  async deleteProfileImage(url: string, publicId?: string) {
    if (this.cloudinaryEnabled) {
      const cloudinaryPublicId = publicId ?? this.publicIdFromCloudinaryUrl(url);

      if (cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(cloudinaryPublicId, { resource_type: 'image' });
        } catch {
          // The database update is authoritative; failed remote deletes are ignored.
        }
        return;
      }
    }

    if (!url.startsWith('/uploads/profile/')) {
      return;
    }

    const relativePath = url.replace(/^\/uploads\//, '');

    try {
      await unlink(join(process.cwd(), 'uploads', relativePath));
    } catch {
      // The database update is authoritative; missing local files are ignored.
    }
  }

  private uploadToCloudinary(
    folder: string,
    file: UploadedFileLike,
    kind: 'avatar' | 'cover' | 'photo' | 'evidence',
    resourceType: 'image' | 'auto' = 'image',
  ) {
    return new Promise<StoredProfileImage>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder.startsWith('reports/')
            ? `vn-jp-connect/${folder}`
            : `vn-jp-connect/profile/${folder}`,
          public_id: `${kind}-${randomUUID()}`,
          resource_type: resourceType,
        },
        (error, result?: UploadApiResponse) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result?.secure_url) {
            reject(new Error('Cloudinary upload did not return a secure URL'));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      stream.end(file.buffer);
    });
  }

  private extensionFromMimeType(mimetype: string) {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extensions[mimetype];

    if (!extension) {
      throw new BadRequestException('unsupported image type');
    }

    return extension;
  }

  private extensionFromEvidenceMimeType(mimetype: string) {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'application/pdf': '.pdf',
    };
    const extension = extensions[mimetype];

    if (!extension) {
      throw new BadRequestException('unsupported evidence file type');
    }

    return extension;
  }

  private publicIdFromCloudinaryUrl(url: string) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!cloudName || !url.includes(`res.cloudinary.com/${cloudName}/`)) {
      return undefined;
    }

    try {
      const parsedUrl = new URL(url);
      const uploadIndex = parsedUrl.pathname.indexOf('/upload/');

      if (uploadIndex === -1) {
        return undefined;
      }

      const afterUpload = parsedUrl.pathname.slice(uploadIndex + '/upload/'.length);
      const withoutVersion = afterUpload.replace(/^v\d+\//, '');

      return withoutVersion.replace(/\.[^/.]+$/, '');
    } catch {
      return undefined;
    }
  }
}
