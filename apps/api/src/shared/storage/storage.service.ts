import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

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

export interface DiskStats {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  freeGb: number;
  healthy: boolean;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageRoot: string;
  private readonly minFreeGb: number;

  constructor(private readonly configService: ConfigService) {
    const configured = this.configService.get<string>('storage.localRoot');
    this.storageRoot = configured
      ? path.resolve(configured)
      : path.resolve(process.cwd(), 'storage');

    this.minFreeGb = this.configService.get<number>('storage.minFreeGb') ?? 5;

    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }

    this.logger.log(`Storage root: ${this.storageRoot} (min free: ${this.minFreeGb} GB)`);
  }

  async upload(params: StorageUploadParams): Promise<StorageFile> {
    await this.guardDiskSpace();

    const absPath = this.resolveKey(params.key);

    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write with mode 0o644 — never executable
    fs.writeFileSync(absPath, params.buffer, { mode: 0o644 });

    this.logger.debug(`Stored: ${params.key} (${params.buffer.length} bytes)`);

    return {
      key: params.key,
      url: `/api/v1/knowledge/files/${encodeURIComponent(params.key)}`,
      size: params.buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    const absPath = this.resolveKey(key);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
      // Remove empty parent dirs up to storageRoot
      this.pruneEmptyDirs(path.dirname(absPath));
    }
  }

  async getSignedUrl(key: string, _expiresIn = 3600): Promise<string> {
    const token = crypto
      .createHmac('sha256', process.env['STORAGE_SIGNING_KEY'] ?? 'dev-signing-key')
      .update(key)
      .digest('hex')
      .slice(0, 16);
    return `/api/v1/knowledge/files/${encodeURIComponent(key)}?t=${token}`;
  }

  async readBuffer(key: string): Promise<Buffer | null> {
    const absPath = this.resolveKey(key);
    if (!fs.existsSync(absPath)) return null;
    return fs.readFileSync(absPath);
  }

  getDiskStats(): DiskStats {
    try {
      // statfsSync available in Node ≥ 19.6; fall back gracefully
      const stats = (fs as unknown as { statfsSync?: (p: string) => { bfree: bigint; bsize: bigint; blocks: bigint } }).statfsSync?.(this.storageRoot);
      if (stats) {
        const freeBytes = Number(stats.bfree) * Number(stats.bsize);
        const totalBytes = Number(stats.blocks) * Number(stats.bsize);
        const usedBytes = totalBytes - freeBytes;
        const freeGb = freeBytes / (1024 ** 3);
        return { totalBytes, freeBytes, usedBytes, freeGb, healthy: freeGb >= this.minFreeGb };
      }
    } catch {
      // fall through to OS-level check
    }

    // Fallback: estimate via os.freemem (not disk-specific, but better than nothing)
    const freeBytes = os.freemem();
    const totalBytes = os.totalmem();
    const freeGb = freeBytes / (1024 ** 3);
    return {
      totalBytes,
      freeBytes,
      usedBytes: totalBytes - freeBytes,
      freeGb,
      healthy: freeGb >= this.minFreeGb,
    };
  }

  /** Canonical key → absolute path; throws on traversal attempt. */
  private resolveKey(key: string): string {
    // Reject suspicious characters before any path resolution
    if (key.includes('\0') || key.includes('..')) {
      throw new BadRequestException('Invalid storage key');
    }

    const abs = path.resolve(this.storageRoot, key);

    if (!abs.startsWith(this.storageRoot + path.sep) && abs !== this.storageRoot) {
      throw new BadRequestException('Invalid storage key');
    }

    return abs;
  }

  private async guardDiskSpace(): Promise<void> {
    const stats = this.getDiskStats();
    if (!stats.healthy) {
      this.logger.error(
        `Disk space critical: ${stats.freeGb.toFixed(2)} GB free (min ${this.minFreeGb} GB required)`,
      );
      throw new BadRequestException(
        `Storage unavailable: insufficient disk space (${stats.freeGb.toFixed(1)} GB free, ${this.minFreeGb} GB required)`,
      );
    }
  }

  private pruneEmptyDirs(dir: string): void {
    if (!dir.startsWith(this.storageRoot) || dir === this.storageRoot) return;
    try {
      const entries = fs.readdirSync(dir);
      if (entries.length === 0) {
        fs.rmdirSync(dir);
        this.pruneEmptyDirs(path.dirname(dir));
      }
    } catch {
      // ignore
    }
  }
}
