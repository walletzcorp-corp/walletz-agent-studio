import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, isNull, or } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { conversations, messages } from '../../database/schema/conversations';
import { createId } from '../../database/utils/id';

@Injectable()
export class ConversationsService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async listConversations(
    tenantId: string,
    params?: { status?: string; agentId?: string; limit?: number; offset?: number },
  ) {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const rows = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.tenantId, tenantId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async getConversation(tenantId: string, conversationId: string) {
    const [conv] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
      .limit(1);
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async getMessages(tenantId: string, conversationId: string) {
    await this.getConversation(tenantId, conversationId);
    return this.db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.tenantId, tenantId)))
      .orderBy(desc(messages.createdAt));
  }

  async sendHumanMessage(
    tenantId: string,
    conversationId: string,
    text: string,
    userId: string,
  ) {
    const conv = await this.getConversation(tenantId, conversationId);

    const [msg] = await this.db
      .insert(messages)
      .values({
        conversationId,
        tenantId,
        direction: 'outbound',
        status: 'pending',
        content: { text },
        sentByUserId: userId,
        isAiGenerated: false,
      })
      .returning();

    await this.db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date(), aiPausedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return msg;
  }

  async assumeConversation(tenantId: string, conversationId: string, userId: string) {
    await this.getConversation(tenantId, conversationId);
    await this.db
      .update(conversations)
      .set({
        assignedToUserId: userId,
        aiPausedAt: new Date(),
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)));
    return this.getConversation(tenantId, conversationId);
  }

  async returnToAi(tenantId: string, conversationId: string) {
    await this.getConversation(tenantId, conversationId);
    await this.db
      .update(conversations)
      .set({
        aiPausedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)));
    return this.getConversation(tenantId, conversationId);
  }

  async resolveConversation(tenantId: string, conversationId: string) {
    await this.getConversation(tenantId, conversationId);
    await this.db
      .update(conversations)
      .set({ status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)));
    return this.getConversation(tenantId, conversationId);
  }
}
