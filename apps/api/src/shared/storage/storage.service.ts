import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StorageUploadParams {
  key: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface StorageFile {
  key: string;
  url: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Dev: store locally. Prod: replace with S3 client.
    const endpoint = this.configService.get<string>('storage.endpoint') ?? 'http://localhost:9000';
    this.publicUrl = this.configService.get<string>('storage.publicUrl') ?? endpoint;

    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(params: StorageUploadParams): Promise<StorageFile> {
    const bucket = 'walletz-knowledge';
    const bucketDir = path.join(this.uploadDir, bucket);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    const filePath = path.join(bucketDir, params.key.replace(/\//g, '_'));
    fs.writeFileSync(filePath, params.buffer);

    this.logger.debug(`Stored file: ${filePath} (${params.buffer.length} bytes)`);

    return {
      key: params.key,
      url: `/api/v1/knowledge/files/${params.key.replace(/\//g, '_')}`,
      size: params.buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    const bucket = 'walletz-knowledge';
    const filePath = path.join(this.uploadDir, bucket, key.replace(/\//g, '_'));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const token = crypto
      .createHmac('sha256', 'dev-signing-key')
      .update(`${key}:${expiresIn}`)
      .digest('hex')
      .slice(0, 16);
    return `/api/v1/knowledge/files/${key.replace(/\//g, '_')}?t=${token}`;
  }

  async readBuffer(key: string): Promise<Buffer | null> {
    const bucket = 'walletz-knowledge';
    const filePath = path.join(this.uploadDir, bucket, key.replace(/\//g, '_'));
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }
}
