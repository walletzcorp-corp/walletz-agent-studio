import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { knowledgeItems } from '../../database/schema/knowledge';
import { eq, and, isNull, desc } from 'drizzle-orm';
import type { NewKnowledgeItem } from '../../database/schema/knowledge';
import type { KnowledgeItemType } from './dto/knowledge-item.dto';

@Injectable()
export class TeachRepository {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async create(data: NewKnowledgeItem) {
    const [row] = await this.db.insert(knowledgeItems).values(data).returning();
    return row!;
  }

  async findById(id: string, tenantId: string) {
    const [row] = await this.db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.id, id),
          eq(knowledgeItems.tenantId, tenantId),
          isNull(knowledgeItems.deletedAt),
        ),
      );
    return row ?? null;
  }

  async findByTenant(
    tenantId: string,
    filters?: { type?: KnowledgeItemType; agentId?: string; approved?: boolean },
  ) {
    const conditions = [eq(knowledgeItems.tenantId, tenantId), isNull(knowledgeItems.deletedAt)];

    if (filters?.type) conditions.push(eq(knowledgeItems.type, filters.type));
    if (filters?.agentId) conditions.push(eq(knowledgeItems.agentId, filters.agentId));
    if (filters?.approved === true) {
      // approved items have approvedAt set
      const { isNotNull } = await import('drizzle-orm');
      conditions.push(isNotNull(knowledgeItems.approvedAt));
    } else if (filters?.approved === false) {
      conditions.push(isNull(knowledgeItems.approvedAt));
    }

    return this.db
      .select()
      .from(knowledgeItems)
      .where(and(...conditions))
      .orderBy(desc(knowledgeItems.createdAt));
  }

  async update(id: string, tenantId: string, data: Partial<NewKnowledgeItem>) {
    const [row] = await this.db
      .update(knowledgeItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.tenantId, tenantId)))
      .returning();
    return row ?? null;
  }

  async approve(id: string, tenantId: string, userId: string) {
    const [row] = await this.db
      .update(knowledgeItems)
      .set({ approvedByUserId: userId, approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.tenantId, tenantId)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, tenantId: string) {
    await this.db
      .update(knowledgeItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.tenantId, tenantId)));
  }
}
