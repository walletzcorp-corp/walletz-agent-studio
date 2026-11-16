import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { labConversations, labMessages } from '../../database/schema/lab';
import { agents } from '../../database/schema/agents';
import { createId } from '../../database/utils/id';
import type { TenantContext } from '../../shared/rbac/tenant-context';

const MAX_CONTEXT_MESSAGES = 20;

export interface LabConversationSummary {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export interface LabConversationDetail extends LabConversationSummary {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }>;
}

@Injectable()
export class LabConversationsService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async list(tenant: TenantContext): Promise<LabConversationSummary[]> {
    const rows = await this.db
      .select({
        id: labConversations.id,
        agentId: labConversations.agentId,
        agentName: agents.name,
        title: labConversations.title,
        lastMessageAt: labConversations.lastMessageAt,
        createdAt: labConversations.createdAt,
      })
      .from(labConversations)
      .innerJoin(agents, eq(labConversations.agentId, agents.id))
      .where(
        and(
          eq(labConversations.tenantId, tenant.tenantId),
          eq(labConversations.userId, tenant.userId),
          isNull(labConversations.deletedAt),
        ),
      )
      .orderBy(desc(labConversations.updatedAt))
      .limit(100);

    return rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      agentName: r.agentName,
      title: r.title,
      lastMessageAt: r.lastMessageAt,
      createdAt: r.createdAt,
    }));
  }

  async get(id: string, tenant: TenantContext): Promise<LabConversationDetail> {
    const [conv] = await this.db
      .select({
        id: labConversations.id,
        agentId: labConversations.agentId,
        agentName: agents.name,
        title: labConversations.title,
        lastMessageAt: labConversations.lastMessageAt,
        createdAt: labConversations.createdAt,
      })
      .from(labConversations)
      .innerJoin(agents, eq(labConversations.agentId, agents.id))
      .where(
        and(
          eq(labConversations.id, id),
          eq(labConversations.tenantId, tenant.tenantId),
          eq(labConversations.userId, tenant.userId),
          isNull(labConversations.deletedAt),
        ),
      )
      .limit(1);

    if (!conv) throw new NotFoundException('Conversa não encontrada');

    const msgs = await this.db
      .select()
      .from(labMessages)
      .where(eq(labMessages.conversationId, id))
      .orderBy(labMessages.createdAt);

    return {
      ...conv,
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        metadata: (m.metadata ?? {}) as Record<string, unknown>,
        createdAt: m.createdAt,
      })),
    };
  }

  async create(agentId: string, tenant: TenantContext): Promise<{ id: string }> {
    const [agent] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenant.tenantId), isNull(agents.deletedAt)))
      .limit(1);

    if (!agent) throw new NotFoundException('Agente não encontrado');

    const id = createId();
    await this.db.insert(labConversations).values({
      id,
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      agentId,
      title: 'Nova conversa',
    });

    return { id };
  }

  async rename(id: string, title: string, tenant: TenantContext): Promise<void> {
    await this.requireOwnership(id, tenant);
    await this.db
      .update(labConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(labConversations.id, id));
  }

  async delete(id: string, tenant: TenantContext): Promise<void> {
    await this.requireOwnership(id, tenant);
    await this.db
      .update(labConversations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(labConversations.id, id));
  }

  async saveUserMessage(
    conversationId: string,
    content: string,
    tenant: TenantContext,
  ): Promise<string> {
    const id = createId();
    await this.db.insert(labMessages).values({
      id,
      conversationId,
      tenantId: tenant.tenantId,
      role: 'user',
      content,
      metadata: {},
    });
    return id;
  }

  async saveAssistantMessage(
    conversationId: string,
    content: string,
    metadata: Record<string, unknown>,
    tenant: TenantContext,
  ): Promise<string> {
    const id = createId();
    const now = new Date();
    await this.db.insert(labMessages).values({
      id,
      conversationId,
      tenantId: tenant.tenantId,
      role: 'assistant',
      content,
      metadata,
    });
    await this.db
      .update(labConversations)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(labConversations.id, conversationId));
    return id;
  }

  async autoTitle(conversationId: string, firstUserMessage: string, agentName: string): Promise<void> {
    const truncated = firstUserMessage.slice(0, 50).trimEnd();
    const title = `${truncated} — ${agentName}`;
    await this.db
      .update(labConversations)
      .set({ title, updatedAt: new Date() })
      .where(
        and(
          eq(labConversations.id, conversationId),
          eq(labConversations.title, 'Nova conversa'),
        ),
      );
  }

  async getContextMessages(
    conversationId: string,
    tenant: TenantContext,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    await this.requireOwnership(conversationId, tenant);
    const msgs = await this.db
      .select({ role: labMessages.role, content: labMessages.content })
      .from(labMessages)
      .where(eq(labMessages.conversationId, conversationId))
      .orderBy(desc(labMessages.createdAt))
      .limit(MAX_CONTEXT_MESSAGES);

    return msgs.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  async requireOwnership(id: string, tenant: TenantContext): Promise<void> {
    const [row] = await this.db
      .select({ id: labConversations.id })
      .from(labConversations)
      .where(
        and(
          eq(labConversations.id, id),
          eq(labConversations.tenantId, tenant.tenantId),
          eq(labConversations.userId, tenant.userId),
          isNull(labConversations.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new ForbiddenException('Conversa não encontrada ou sem permissão');
  }
}
