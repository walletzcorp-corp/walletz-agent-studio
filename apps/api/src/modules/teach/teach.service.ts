import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TeachRepository } from './teach.repository';
import { AuditService } from '../../shared/audit/audit.service';
import { createId } from '../../database/utils/id';
import type { CreateKnowledgeItemDto, UpdateKnowledgeItemDto } from './dto/knowledge-item.dto';

@Injectable()
export class TeachService {
  constructor(
    private readonly repo: TeachRepository,
    private readonly auditService: AuditService,
  ) {}

  async listItems(
    tenantId: string,
    filters?: { type?: string; agentId?: string; approved?: boolean },
  ) {
    return this.repo.findByTenant(
      tenantId,
      filters as Parameters<TeachRepository['findByTenant']>[1],
    );
  }

  async getItem(id: string, tenantId: string) {
    const item = await this.repo.findById(id, tenantId);
    if (!item) throw new NotFoundException('Knowledge item not found');
    return item;
  }

  async create(dto: CreateKnowledgeItemDto, tenantId: string, userId: string) {
    const item = await this.repo.create({
      id: createId(),
      tenantId,
      agentId: dto.agentId ?? null,
      type: dto.type,
      content: dto.content,
      context: dto.context ?? null,
      confidence: dto.confidence ?? 1.0,
      tags: dto.tags ?? [],
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      version: 1,
    });

    await this.auditService.log({
      action: 'knowledge_item.create',
      resourceType: 'knowledge_item',
      resourceId: item.id,
      tenantId,
      userId,
      metadata: { type: dto.type },
    });

    return item;
  }

  async update(id: string, dto: UpdateKnowledgeItemDto, tenantId: string, userId: string) {
    const existing = await this.getItem(id, tenantId);

    const updated = await this.repo.update(id, tenantId, {
      content: dto.content ?? existing.content,
      context: dto.context !== undefined ? (dto.context ?? null) : existing.context,
      confidence: dto.confidence ?? existing.confidence,
      tags: dto.tags ?? existing.tags,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : existing.validUntil,
      version: (existing.version ?? 1) + 1,
      // Editing requires re-approval
      approvedAt: null,
      approvedByUserId: null,
    });

    await this.auditService.log({
      action: 'knowledge_item.update',
      resourceType: 'knowledge_item',
      resourceId: id,
      tenantId,
      userId,
    });

    return updated;
  }

  async approve(id: string, tenantId: string, userId: string) {
    const item = await this.getItem(id, tenantId);
    if (item.approvedAt) throw new ForbiddenException('Item is already approved');

    const updated = await this.repo.approve(id, tenantId, userId);

    await this.auditService.log({
      action: 'knowledge_item.approve',
      resourceType: 'knowledge_item',
      resourceId: id,
      tenantId,
      userId,
    });

    return updated;
  }

  async revokeApproval(id: string, tenantId: string, userId: string) {
    const item = await this.getItem(id, tenantId);
    if (!item.approvedAt) throw new ForbiddenException('Item is not approved');

    const updated = await this.repo.update(id, tenantId, {
      approvedAt: null,
      approvedByUserId: null,
    });

    await this.auditService.log({
      action: 'knowledge_item.revoke_approval',
      resourceType: 'knowledge_item',
      resourceId: id,
      tenantId,
      userId,
    });

    return updated;
  }

  async remove(id: string, tenantId: string, userId: string) {
    await this.getItem(id, tenantId);
    await this.repo.softDelete(id, tenantId);

    await this.auditService.log({
      action: 'knowledge_item.delete',
      resourceType: 'knowledge_item',
      resourceId: id,
      tenantId,
      userId,
    });
  }
}
