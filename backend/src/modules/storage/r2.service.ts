import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
  private presignClient: S3Client | null = null;

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: process.env.R2_REGION ?? 'us-east-1', // S3-compatible stores want a concrete region; Cloudflare R2 sets R2_REGION=auto
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true, // R2 and self-hosted S3 stores use https://endpoint/bucket path style
      });
    }
    return this.client;
  }

  /** Client for presigning: must use the endpoint the user's browser can reach, not just this process. */
  private getPresignClient(): S3Client {
    const presignEndpoint = process.env.R2_PRESIGN_ENDPOINT;
    if (!presignEndpoint) return this.getClient();
    if (!this.presignClient) {
      this.presignClient = new S3Client({
        region: process.env.R2_REGION ?? 'us-east-1',
        endpoint: presignEndpoint,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
      });
    }
    return this.presignClient;
  }

  static buildObjectKey(courseId: string, lessonId: string, fileName: string) {
    const safeName = fileName.replace(/[^\w.\-]/g, '_');
    return `courses/${courseId}/lessons/${lessonId}/${randomUUID()}-${safeName}`;
  }

  static buildAvatarKey(userId: string, fileName: string) {
    const safeName = fileName.replace(/[^\w.\-]/g, '_');
    return `avatars/${userId}/${randomUUID()}-${safeName}`;
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

  /** Endpoint embedded in presigned URLs — must be reachable from the user's browser, not just this process. */
  async presignedPut(objectKey: string, expiresIn = 900): Promise<string> {
    this.assertConfigured();
    const cmd = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });
    return getSignedUrl(this.getPresignClient(), cmd, { expiresIn });
  }

  async presignedGet(objectKey: string): Promise<string> {
    this.assertConfigured();
    const cmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });
    return getSignedUrl(this.getPresignClient(), cmd, { expiresIn: 3600 });
  }

  /** Verifies an object exists after the client claims to have PUT it. */
  async objectExists(objectKey: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.getClient().send(
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: objectKey }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Object storage is not configured');
    }
  }

  isConfigured(): boolean {
    const [endpoint, key, secret] = [
      process.env.R2_ENDPOINT,
      process.env.R2_ACCESS_KEY_ID,
      process.env.R2_SECRET_ACCESS_KEY,
    ];
    return !!(endpoint && key && secret && !key.startsWith('your-') && !endpoint.startsWith('https://your-'));
  }
}
