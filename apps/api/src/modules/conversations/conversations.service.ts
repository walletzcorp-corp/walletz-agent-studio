import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { conversations, messages, humanHandoffs } from '../../database/schema/conversations';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly webhooks: WebhooksService,
    private readonly whatsapp: WhatsappService,
  ) {}

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

  /** Conversa com o motivo da passagem para atendimento humano, se houver uma ativa. */
  async getConversationDetail(tenantId: string, conversationId: string) {
    const conv = await this.getConversation(tenantId, conversationId);
    const [handoff] = await this.db
      .select({ reason: humanHandoffs.reason, createdAt: humanHandoffs.createdAt })
      .from(humanHandoffs)
      .where(and(
        eq(humanHandoffs.tenantId, tenantId),
        eq(humanHandoffs.conversationId, conversationId),
        eq(humanHandoffs.status, 'active'),
      ))
      .orderBy(desc(humanHandoffs.createdAt))
      .limit(1);
    return { ...conv, handoff: handoff ?? null };
  }

  async getMessages(tenantId: string, conversationId: string) {
    await this.getConversation(tenantId, conversationId);
    return this.db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.tenantId, tenantId)))
      .orderBy(desc(messages.createdAt));
  }

  /**
   * Resposta de um atendente. No WhatsApp ela é enviada ao cliente pela Meta; no webchat o
   * widget lê a mensagem da conversa.
   */
  async sendHumanMessage(
    tenantId: string,
    conversationId: string,
    text: string,
    userId: string,
  ) {
    const conv = await this.getConversation(tenantId, conversationId);
    if (conv.channel === 'whatsapp') return this.whatsapp.sendHumanReply(tenantId, conversationId, text, userId);

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

    return msg;
  }

  /** Reenvia uma resposta que não chegou ao cliente (só WhatsApp tem envio que pode falhar). */
  async resendMessage(tenantId: string, conversationId: string, messageId: string, userId: string) {
    const conv = await this.getConversation(tenantId, conversationId);
    if (conv.channel !== 'whatsapp') throw new NotFoundException('Mensagem não encontrada.');
    return this.whatsapp.resendMessage(tenantId, conversationId, messageId, userId);
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
    await this.db
      .update(humanHandoffs)
      .set({ assignedToUserId: userId, updatedAt: new Date() })
      .where(and(eq(humanHandoffs.tenantId, tenantId), eq(humanHandoffs.conversationId, conversationId), eq(humanHandoffs.status, 'active')));
    void this.webhooks.emit(tenantId, 'conversation.handoff', { conversationId, assignedToUserId: userId });
    return this.getConversationDetail(tenantId, conversationId);
  }

  async returnToAi(tenantId: string, conversationId: string) {
    const conv = await this.getConversation(tenantId, conversationId);
    await this.db
      .update(conversations)
      .set({
        aiPausedAt: null,
        // A IA volta a atender: deixa de constar como "aguardando atendente".
        status: conv.status === 'resolved' ? 'resolved' : 'open',
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)));
    await this.closeHandoffs(tenantId, conversationId, 'returned_to_ai');
    return this.getConversationDetail(tenantId, conversationId);
  }

  async resolveConversation(tenantId: string, conversationId: string) {
    await this.getConversation(tenantId, conversationId);
    await this.db
      .update(conversations)
      .set({ status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)));
    await this.closeHandoffs(tenantId, conversationId, 'resolved');
    void this.webhooks.emit(tenantId, 'conversation.resolved', { conversationId });
    return this.getConversationDetail(tenantId, conversationId);
  }

  private async closeHandoffs(tenantId: string, conversationId: string, status: 'resolved' | 'returned_to_ai'): Promise<void> {
    await this.db
      .update(humanHandoffs)
      .set({ status, resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(humanHandoffs.tenantId, tenantId), eq(humanHandoffs.conversationId, conversationId), eq(humanHandoffs.status, 'active')));
  }
}
