import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { agents } from '../../database/schema/agents';
import type { KnowledgeSource } from '../../database/schema/knowledge';
import { createId } from '../../database/utils/id';
import { AuditService } from '../../shared/audit/audit.service';
import { StorageService, knowledgeStorageKey } from '../../shared/storage/storage.service';
import { KnowledgeRepository } from './knowledge.repository';
import { KNOWLEDGE_QUEUE, type KnowledgeJobData } from './knowledge.processor';
import type { CreateTypedSourceDto, CreateUrlSourceDto, UploadSourceDto } from './dto/upload-source.dto';
import { detectKnowledgeFormat, KNOWLEDGE_FORMATS, sanitizeFilename, type KnowledgeFormat } from './parsers/file-type';

/** Limite técnico por arquivo (proteção, não limite comercial). KNOWLEDGE_MAX_FILE_SIZE_MB, padrão 50. */
export function knowledgeMaxFileBytes(): number {
  const mb = Number(process.env['KNOWLEDGE_MAX_FILE_SIZE_MB'] ?? 50);
  return (Number.isFinite(mb) && mb > 0 ? mb : 50) * 1024 * 1024;
}

const SOURCE_TYPE_BY_FORMAT: Record<KnowledgeFormat, KnowledgeSource['type']> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
  md: 'txt',
  csv: 'csv',
  html: 'html',
};

/** Documento como sai da API. */
export interface KnowledgeSourceView extends KnowledgeSource {
  duplicate?: boolean;
}

@Injectable()
export class KnowledgeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly repo: KnowledgeRepository,
    private readonly storage: StorageService,
    private readonly auditService: AuditService,
    @InjectQueue(KNOWLEDGE_QUEUE) private readonly queue: Queue<KnowledgeJobData>,
  ) {}

  /** Nenhum documento fica parado para sempre: o que ficou em andamento num restart volta para a fila. */
  onApplicationBootstrap(): void {
    // Roda depois da subida (não atrasa o boot) e tenta de novo se o banco ainda não respondeu.
    const run = async (attempt: number): Promise<void> => {
      try {
        const stale = await this.repo.findStaleSources(new Date(Date.now() - 2 * 60 * 1000));
        for (const s of stale) await this.enqueue(s.id, s.tenantId);
        if (stale.length > 0) this.logger.log(`Reenfileirados ${stale.length} documentos que estavam em andamento`);
      } catch (err) {
        if (attempt < 3) {
          setTimeout(() => void run(attempt + 1), 15_000).unref();
          return;
        }
        this.logger.warn(`Não foi possível verificar documentos pendentes: ${String(err)}`);
      }
    };
    setTimeout(() => void run(1), 5_000).unref();
  }

  private async enqueue(sourceId: string, tenantId: string): Promise<void> {
    await this.queue.add('process-file', { sourceId, tenantId }, { jobId: `${sourceId}-${Date.now()}` });
  }

  private async assertAgent(tenantId: string, agentId: string | null | undefined): Promise<string | null> {
    if (!agentId) return null;
    const [agent] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);
    if (!agent) throw new NotFoundException('Agente não encontrado nesta organização');
    return agent.id;
  }

  async listSources(tenantId: string, agentId?: string) {
    return this.repo.findSourcesByTenant(tenantId, agentId);
  }

  async getSource(id: string, tenantId: string) {
    const source = await this.repo.findSourceById(id, tenantId);
    if (!source) throw new NotFoundException('Documento não encontrado');
    return source;
  }

  /** Detalhes: metadados, contagem de trechos/embeddings e prévia do texto extraído. */
  async getDetails(id: string, tenantId: string) {
    const source = await this.getSource(id, tenantId);
    const [stats, preview] = await Promise.all([this.repo.chunkStats(id, tenantId), this.repo.previewChunks(id, tenantId)]);
    return { ...source, chunks: stats.total, embeddedChunks: stats.embedded, extractedCharacters: stats.characters, preview };
  }

  /**
   * Upload: valida (tamanho, formato pelo conteúdo), calcula SHA-256, deduplica no tenant,
   * grava em storage local com IDs internos e registra os metadados. O processamento
   * (extração → trechos → embeddings) roda na fila.
   */
  async uploadFile(file: Express.Multer.File, dto: UploadSourceDto, tenantId: string, userId: string): Promise<KnowledgeSourceView> {
    if (!file?.buffer) throw new BadRequestException('Nenhum arquivo enviado.');
    if (file.size > knowledgeMaxFileBytes()) {
      throw new PayloadTooLargeException(`O arquivo passa do limite de ${knowledgeMaxFileBytes() / 1024 / 1024} MB.`);
    }
    // Multer entrega o nome em latin1; corrige acentos antes de sanitizar.
    const rawName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const originalName = sanitizeFilename(rawName.includes('�') ? file.originalname : rawName);
    const { format, mimeType } = detectKnowledgeFormat(originalName, file.buffer);
    const agentId = await this.assertAgent(tenantId, dto.agentId);

    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const existing = await this.repo.findSourceByChecksum(tenantId, checksum);
    if (existing) return { ...existing, duplicate: true };

    const sourceId = createId();
    const storageKey = knowledgeStorageKey(tenantId, sourceId, format);
    await this.storage.upload({ key: storageKey, buffer: file.buffer, mimeType, originalName });

    let source: KnowledgeSource;
    try {
      source = await this.repo.createSource({
        id: sourceId,
        tenantId,
        agentId,
        name: sanitizeFilename(dto.name ?? originalName),
        type: SOURCE_TYPE_BY_FORMAT[format],
        status: 'uploaded',
        storageKey,
        checksum,
        mimeType,
        extension: format,
        fileSizeBytes: file.size,
        tags: dto.tags ?? [],
        language: dto.language ?? 'pt-BR',
        priority: dto.priority ?? 0,
        uploadedByUserId: userId,
      });
    } catch (err) {
      await this.storage.delete(storageKey).catch(() => undefined); // sem arquivo órfão
      throw err;
    }

    await this.enqueue(source.id, tenantId);
    await this.auditService.log({
      action: 'knowledge_source.upload',
      resourceType: 'knowledge_source',
      resourceId: source.id,
      tenantId,
      userId,
      metadata: { filename: originalName, size: file.size, format, agentId },
    });
    return source;
  }

  async createFromUrl(dto: CreateUrlSourceDto, _tenantId: string, _userId: string): Promise<never> {
    // Não finge suporte: a leitura de URLs ainda não existe.
    throw new BadRequestException(`A importação por URL ainda não está disponível (${dto.url}). Envie o conteúdo como arquivo ou texto.`);
  }

  /** Conteúdo digitado: vira um .txt no storage e passa pelo mesmo pipeline dos arquivos. */
  async createTyped(dto: CreateTypedSourceDto, tenantId: string, userId: string) {
    const title = sanitizeFilename(dto.name, 'Conteúdo digitado');
    const content = dto.content.trim();
    if (!content) throw new BadRequestException('O conteúdo está vazio.');
    const agentId = await this.assertAgent(tenantId, dto.agentId);
    const text = [`# ${title}`, dto.context?.trim() ? `Contexto: ${dto.context.trim()}` : null, content].filter(Boolean).join('\n\n');
    const buffer = Buffer.from(text, 'utf-8');
    if (buffer.length > knowledgeMaxFileBytes()) throw new PayloadTooLargeException('O conteúdo é grande demais.');

    const sourceId = createId();
    const storageKey = knowledgeStorageKey(tenantId, sourceId, 'txt');
    await this.storage.upload({ key: storageKey, buffer, mimeType: KNOWLEDGE_FORMATS.txt.mimeType, originalName: `${title}.txt` });

    const source = await this.repo.createSource({
      id: sourceId,
      tenantId,
      agentId,
      name: title,
      type: 'typed',
      status: 'uploaded',
      storageKey,
      checksum: crypto.createHash('sha256').update(buffer).digest('hex'),
      mimeType: KNOWLEDGE_FORMATS.txt.mimeType,
      extension: 'txt',
      fileSizeBytes: buffer.length,
      tags: dto.tags ?? [],
      uploadedByUserId: userId,
    });
    await this.enqueue(source.id, tenantId);
    await this.auditService.log({
      action: 'knowledge_source.typed',
      resourceType: 'knowledge_source',
      resourceId: source.id,
      tenantId,
      userId,
      metadata: { title, agentId, characters: content.length },
    });
    return source;
  }

  /** Reprocessa (também indexa documentos que aguardavam configuração de IA). */
  async retryProcessing(id: string, tenantId: string) {
    const source = await this.getSource(id, tenantId);
    if (!source.storageKey) throw new BadRequestException('Este documento não tem arquivo para reprocessar.');
    if (!(await this.storage.exists(source.storageKey))) {
      throw new BadRequestException('O arquivo original não está mais no armazenamento. Envie o documento de novo.');
    }
    await this.repo.updateSource(id, tenantId, { status: 'uploaded', processingError: null, indexError: null, indexStatus: 'pending' });
    await this.enqueue(id, tenantId);
    return this.getSource(id, tenantId);
  }

  /** Associa o documento a um agente específico ou a todos (null). */
  async setAgent(id: string, tenantId: string, agentId: string | null, userId: string) {
    const source = await this.getSource(id, tenantId);
    const target = await this.assertAgent(tenantId, agentId);
    const updated = await this.repo.updateSource(id, tenantId, { agentId: target });
    await this.auditService.log({
      action: 'knowledge_source.agent_changed',
      resourceType: 'knowledge_source',
      resourceId: id,
      tenantId,
      userId,
      previousState: { agentId: source.agentId },
      newState: { agentId: target },
    });
    return updated;
  }

  /** Arquivo original para download (sempre do próprio tenant). */
  async download(id: string, tenantId: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const source = await this.getSource(id, tenantId);
    if (!source.storageKey) throw new NotFoundException('Este documento não tem arquivo.');
    const buffer = await this.storage.readBuffer(source.storageKey);
    if (!buffer) throw new NotFoundException('O arquivo original não foi encontrado no armazenamento.');
    const ext = source.extension ?? source.storageKey.split('.').pop() ?? 'bin';
    const base = source.name.toLowerCase().endsWith(`.${ext}`) ? source.name : `${source.name}.${ext}`;
    return { buffer, filename: sanitizeFilename(base), mimeType: source.mimeType ?? 'application/octet-stream' };
  }

  /** Exclusão completa: trechos e embeddings, arquivo físico e o registro (soft delete). */
  async deleteSource(id: string, tenantId: string, userId: string) {
    const source = await this.getSource(id, tenantId);
    await this.repo.deleteChunksBySource(id, tenantId);
    if (source.storageKey) await this.storage.delete(source.storageKey);
    await this.repo.softDeleteSource(id, tenantId);
    await this.auditService.log({
      action: 'knowledge_source.delete',
      resourceType: 'knowledge_source',
      resourceId: id,
      tenantId,
      userId,
      metadata: { name: source.name },
    });
  }
}
