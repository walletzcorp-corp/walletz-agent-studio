import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { conversations, messages } from '../../database/schema/conversations';
import { INBOX_DISPATCH_QUEUE, type InboxDispatchJobData } from './inbox-dispatch.processor';

const CONVERSATION_STATUSES = [
  'open',
  'in_progress',
  'waiting_human',
  'resolved',
  'opted_out',
] as const;

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    @InjectQueue(INBOX_DISPATCH_QUEUE) private readonly inboxQueue: Queue<InboxDispatchJobData>,
  ) {}

  async listConversations(
    tenantId: string,
    params?: { status?: string; agentId?: string; limit?: number; offset?: number },
  ) {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    if (params?.status && !CONVERSATION_STATUSES.includes(params.status as never)) {
      throw new BadRequestException('Invalid conversation status');
    }

    const rows = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.tenantId, tenantId),
          ...(params?.status
            ? [eq(conversations.status, params.status as (typeof CONVERSATION_STATUSES)[number])]
            : []),
          ...(params?.agentId ? [eq(conversations.agentId, params.agentId)] : []),
        ),
      )
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

  async sendHumanMessage(tenantId: string, conversationId: string, text: string, userId: string) {
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
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)));

    await this.inboxQueue.add(
      'send',
      {
        messageId: msg!.id,
        conversationId,
        tenantId,
        text,
        contactId: conv.contactId,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

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
