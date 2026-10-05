import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { KnowledgeRepository } from './knowledge.repository';
import { StorageService } from '../../shared/storage/storage.service';
import { AuditService } from '../../shared/audit/audit.service';
import { KNOWLEDGE_QUEUE, type KnowledgeJobData } from './knowledge.processor';
import { createId } from '../../database/utils/id';
import type { UploadSourceDto, CreateUrlSourceDto, CreateTypedSourceDto } from './dto/upload-source.dto';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/csv',
  'text/html',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly repo: KnowledgeRepository,
    private readonly storage: StorageService,
    private readonly auditService: AuditService,
    @InjectQueue(KNOWLEDGE_QUEUE) private readonly queue: Queue<KnowledgeJobData>,
  ) {}

  async listSources(tenantId: string, agentId?: string) {
    return this.repo.findSourcesByTenant(tenantId, agentId);
  }

  async getSource(id: string, tenantId: string) {
    const source = await this.repo.findSourceById(id, tenantId);
    if (!source) throw new NotFoundException('Knowledge source not found');
    return source;
  }

  async uploadFile(
    file: Express.Multer.File,
    dto: UploadSourceDto,
    tenantId: string,
    userId: string,
  ) {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed: ${file.mimetype}. Allowed: PDF, DOCX, TXT, CSV, HTML`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds 50 MB limit');
    }

    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const storageKey = `${tenantId}/${createId()}.${ext}`;

    await this.storage.upload({
      key: storageKey,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    const sourceType = this.mimeToSourceType(file.mimetype);

    const source = await this.repo.createSource({
      tenantId,
      agentId: dto.agentId ?? null,
      name: dto.name ?? file.originalname,
      type: sourceType,
      status: 'pending',
      storageKey,
      checksum,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      tags: dto.tags ?? [],
      language: dto.language ?? 'pt-BR',
      priority: dto.priority ?? 0,
      uploadedByUserId: userId,
    });

    await this.queue.add('process-file', {
      sourceId: source.id,
      tenantId,
      storageKey,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    await this.auditService.log({
      action: 'knowledge_source.upload',
      resourceType: 'knowledge_source',
      resourceId: source.id,
      tenantId,
      userId,
      metadata: { filename: file.originalname, size: file.size, mimeType: file.mimetype },
    });

    return source;
  }

  async createFromUrl(dto: CreateUrlSourceDto, tenantId: string, userId: string) {
    const source = await this.repo.createSource({
      tenantId,
      agentId: dto.agentId ?? null,
      name: dto.name ?? dto.url,
      type: 'url',
      status: 'pending',
      url: dto.url,
      tags: dto.tags ?? [],
      priority: dto.priority ?? 0,
      uploadedByUserId: userId,
    });

    // URL crawling is a future enhancement; mark as pending for now
    this.logger.warn(`URL source created (crawling not yet implemented): ${source.id}`);

    return source;
  }

  async createTyped(dto: CreateTypedSourceDto, tenantId: string, userId: string) {
    const checksum = crypto.createHash('sha256').update(dto.content).digest('hex');
    const storageKey = `${tenantId}/${createId()}.txt`;

    await this.storage.upload({
      key: storageKey,
      buffer: Buffer.from(dto.content, 'utf-8'),
      mimeType: 'text/plain',
      originalName: `${dto.name}.txt`,
    });

    const source = await this.repo.createSource({
      tenantId,
      agentId: dto.agentId ?? null,
      name: dto.name,
      type: 'typed',
      status: 'pending',
      storageKey,
      checksum,
      mimeType: 'text/plain',
      fileSizeBytes: Buffer.byteLength(dto.content, 'utf-8'),
      tags: dto.tags ?? [],
      uploadedByUserId: userId,
    });

    await this.queue.add('process-file', {
      sourceId: source.id,
      tenantId,
      storageKey,
      mimeType: 'text/plain',
      originalName: `${dto.name}.txt`,
    });

    return source;
  }

  async retryProcessing(id: string, tenantId: string) {
    const source = await this.getSource(id, tenantId);
    if (!source.storageKey) {
      throw new BadRequestException('Source has no file to reprocess');
    }

    await this.repo.updateSourceStatus(id, tenantId, 'pending');

    await this.queue.add('process-file', {
      sourceId: id,
      tenantId,
      storageKey: source.storageKey,
      mimeType: source.mimeType ?? 'text/plain',
      originalName: source.name,
    });

    return this.getSource(id, tenantId);
  }

  async deleteSource(id: string, tenantId: string, userId: string) {
    const source = await this.getSource(id, tenantId);

    await this.repo.deleteChunksBySource(id, tenantId);

    if (source.storageKey) {
      await this.storage.delete(source.storageKey);
    }

    await this.repo.softDeleteSource(id, tenantId);

    await this.auditService.log({
      action: 'knowledge_source.delete',
      resourceType: 'knowledge_source',
      resourceId: id,
      tenantId,
      userId,
    });
  }

  private mimeToSourceType(
    mime: string,
  ): 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'html' | 'url' | 'faq' | 'typed' {
    if (mime === 'application/pdf') return 'pdf';
    if (mime.includes('wordprocessingml')) return 'docx';
    if (mime === 'text/csv' || mime === 'application/csv') return 'csv';
    if (mime === 'text/html') return 'html';
    return 'txt';
  }
}
