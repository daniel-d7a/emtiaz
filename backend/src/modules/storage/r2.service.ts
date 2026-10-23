import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class R2StorageService {
  private client: S3Client | null = null;

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
      });
    }
    return this.client;
  }

  static buildObjectKey(courseId: string, lessonId: string, fileName: string) {
    const safeName = fileName.replace(/[^\w.\-]/g, '_');
    return `courses/${courseId}/lessons/${lessonId}/${randomUUID()}-${safeName}`;
  }

  static fileTypeFor(mimeType: string | undefined): 'PDF' | 'DOC' | 'AUDIO' | 'IMAGE' | 'ARCHIVE' | 'LINK' | 'VIDEO' {
    const m = mimeType ?? '';
    if (m.includes('pdf')) return 'PDF';
    if (m.startsWith('audio/')) return 'AUDIO';
    if (m.startsWith('image/')) return 'IMAGE';
    if (m.includes('zip') || m.includes('compressed')) return 'ARCHIVE';
    if (['doc', 'docx', 'ppt', 'pptx', 'msword'].some((x) => m.includes(x)))
      return 'DOC';
    if (m.startsWith('video/')) return 'VIDEO';
    return 'PDF';
  }

  async presignedPut(objectKey: string, expiresIn = 900): Promise<string> {
    if (!this.isConfigured()) {
      // Dev/stub mode: pretend upload succeeded against a fixed local URL.
      return `${process.env.R2_PUBLIC_URL ?? 'https://files.localhost'}/${objectKey}?stub-upload=1`;
    }
    const cmd = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });
    return getSignedUrl(this.getClient(), cmd, { expiresIn });
  }

  async presignedGet(objectKey: string): Promise<string> {
    if (!this.isConfigured()) {
      return `${process.env.R2_PUBLIC_URL ?? 'https://files.localhost'}/${objectKey}?stub-download=1`;
    }
    const cmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });
    return getSignedUrl(this.getClient(), cmd, { expiresIn: 3600 });
  }

  /** Verifies an object exists after the client claims to have PUT it. */
  async objectExists(objectKey: string): Promise<boolean> {
    if (!this.isConfigured()) return true; // stub mode
    try {
      await this.getClient().send(
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: objectKey }),
      );
      return true;
    } catch {
      return false;
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID !== 'minioadmin' &&
      !process.env.R2_ACCESS_KEY_ID?.includes('your-')
    );
  }
}
