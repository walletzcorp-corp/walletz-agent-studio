import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, gt, isNull } from 'drizzle-orm';
import * as crypto from 'crypto';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { webchatWidgets, type WebchatWidget } from '../../database/schema/channels';
import { agents } from '../../database/schema/agents';
import { conversations, messages } from '../../database/schema/conversations';
import { contacts } from '../../database/schema/contacts';
import { tenants } from '../../database/schema/tenants';
import { AuditService } from '../../shared/audit/audit.service';
import { PlanLimitsService } from '../../shared/plans/plan-limits.service';
import { LabService } from '../lab/lab.service';
import { WebhooksService } from '../webhooks/webhooks.service';

export const WEBCHAT_CHANNEL = 'webchat';
/** Limite de mensagens do visitante por sessão (protege o consumo de IA do cliente). */
const MAX_VISITOR_MESSAGES_PER_SESSION = 100;
const HISTORY_LIMIT = 20;
const UNAVAILABLE_REPLY =
  'Recebemos sua mensagem. No momento o assistente não está disponível; um atendente vai responder por aqui assim que possível.';

export interface WidgetInput {
  agentId?: string;
  name?: string;
  allowedOrigins?: string[];
  title?: string;
  welcomeMessage?: string | null;
  primaryColor?: string;
  isEnabled?: boolean;
}

export interface VisitorMessage {
  id: string;
  from: 'visitor' | 'agent' | 'human';
  text: string;
  createdAt: Date;
}

interface WebchatMetadata {
  webchat?: { widgetId?: string; tokenHash?: string; origin?: string | null };
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export function normalizeOrigin(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestException(`Origem inválida: ${raw}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new BadRequestException(`Origem inválida: ${raw}`);
  return url.origin;
}

function messageText(content: unknown): string {
  if (content && typeof content === 'object' && 'text' in content) {
    const text = (content as { text?: unknown }).text;
    return typeof text === 'string' ? text : '';
  }
  return '';
}

@Injectable()
export class WebchatService {
  private readonly logger = new Logger(WebchatService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly audit: AuditService,
    private readonly planLimits: PlanLimitsService,
    private readonly lab: LabService,
    private readonly webhooks: WebhooksService,
  ) {}

  // ─── Gestão (painel, autenticado) ──────────────────────────────────────────

  list(tenantId: string): Promise<WebchatWidget[]> {
    return this.db
      .select()
      .from(webchatWidgets)
      .where(and(eq(webchatWidgets.tenantId, tenantId), isNull(webchatWidgets.deletedAt)))
      .orderBy(asc(webchatWidgets.createdAt));
  }

  private async getOwned(tenantId: string, id: string): Promise<WebchatWidget> {
    const [row] = await this.db
      .select()
      .from(webchatWidgets)
      .where(and(eq(webchatWidgets.id, id), eq(webchatWidgets.tenantId, tenantId), isNull(webchatWidgets.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException('Widget não encontrado');
    return row;
  }

  private async assertAgent(tenantId: string, agentId: string): Promise<void> {
    const [agent] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);
    if (!agent) throw new NotFoundException('Agente não encontrado');
  }

  async create(tenantId: string, input: WidgetInput & { agentId: string; name: string }, userId: string): Promise<WebchatWidget> {
    await this.planLimits.assertFeature(tenantId, 'webchat');
    await this.planLimits.assertCanAdd(tenantId, 'webchatWidgets');
    await this.assertAgent(tenantId, input.agentId);

    const [row] = await this.planLimits.withSlot(tenantId, 'webchatWidgets', (tx) =>
      tx
      .insert(webchatWidgets)
      .values({
        tenantId,
        agentId: input.agentId,
        name: input.name.trim(),
        publicKey: `wc_${crypto.randomBytes(18).toString('base64url')}`,
        allowedOrigins: (input.allowedOrigins ?? []).map(normalizeOrigin),
        title: input.title?.trim() || 'Fale com a gente',
        welcomeMessage: input.welcomeMessage?.trim() || null,
        primaryColor: input.primaryColor ?? '#0f766e',
        createdByUserId: userId,
      })
      .returning(),
    );
    await this.audit.log({
      tenantId,
      userId,
      action: 'webchat.widget_created',
      resourceType: 'webchat_widget',
      resourceId: row!.id,
      newState: { agentId: input.agentId, allowedOrigins: row!.allowedOrigins },
    });
    return row!;
  }

  async update(tenantId: string, id: string, input: WidgetInput, userId: string): Promise<WebchatWidget> {
    const existing = await this.getOwned(tenantId, id);
    await this.planLimits.assertWithinPlan(tenantId, 'webchatWidgets', existing.id);
    if (input.agentId) {
      await this.assertAgent(tenantId, input.agentId);
      await this.planLimits.assertWithinPlan(tenantId, 'agents', input.agentId);
    }
    const patch: Partial<WebchatWidget> = { updatedAt: new Date() };
    if (input.agentId !== undefined) patch.agentId = input.agentId;
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.allowedOrigins !== undefined) patch.allowedOrigins = input.allowedOrigins.map(normalizeOrigin);
    if (input.title !== undefined) patch.title = input.title.trim() || 'Fale com a gente';
    if (input.welcomeMessage !== undefined) patch.welcomeMessage = input.welcomeMessage?.trim() || null;
    if (input.primaryColor !== undefined) patch.primaryColor = input.primaryColor;
    if (input.isEnabled !== undefined) patch.isEnabled = input.isEnabled;

    const [row] = await this.db
      .update(webchatWidgets)
      .set(patch)
      .where(and(eq(webchatWidgets.id, id), eq(webchatWidgets.tenantId, tenantId)))
      .returning();
    await this.audit.log({
      tenantId,
      userId,
      action: 'webchat.widget_updated',
      resourceType: 'webchat_widget',
      resourceId: id,
      previousState: { agentId: existing.agentId, allowedOrigins: existing.allowedOrigins, isEnabled: existing.isEnabled },
      newState: { agentId: row!.agentId, allowedOrigins: row!.allowedOrigins, isEnabled: row!.isEnabled },
    });
    return row!;
  }

  async remove(tenantId: string, id: string, userId: string): Promise<void> {
    await this.getOwned(tenantId, id);
    await this.db
      .update(webchatWidgets)
      .set({ deletedAt: new Date(), isEnabled: false, updatedAt: new Date() })
      .where(and(eq(webchatWidgets.id, id), eq(webchatWidgets.tenantId, tenantId)));
    await this.audit.log({ tenantId, userId, action: 'webchat.widget_deleted', resourceType: 'webchat_widget', resourceId: id });
  }

  // ─── Público (site do cliente, sem login) ──────────────────────────────────

  /** Widget ativo + verificação de origem + plano/organização em dia. */
  private async getPublicWidget(publicKey: string, origin: string | undefined): Promise<WebchatWidget> {
    const [row] = await this.db
      .select({ widget: webchatWidgets, tenantStatus: tenants.status })
      .from(webchatWidgets)
      .innerJoin(tenants, eq(tenants.id, webchatWidgets.tenantId))
      .where(and(eq(webchatWidgets.publicKey, publicKey), isNull(webchatWidgets.deletedAt), isNull(tenants.deletedAt)))
      .limit(1);
    if (!row || !row.widget.isEnabled || row.tenantStatus === 'suspended' || row.tenantStatus === 'cancelled') {
      throw new NotFoundException('Webchat indisponível');
    }
    // Mesma regra do painel: trial vencido, webchat fora do plano ou widget acima do limite
    // (os mais novos, depois de rebaixar) deixam o widget indisponível no site.
    const blocked = await this.planLimits.usageBlock(row.widget.tenantId, {
      feature: 'webchat',
      item: { resource: 'webchatWidgets', id: row.widget.id },
    });
    if (blocked) throw new NotFoundException('Webchat indisponível');
    const allowed = (row.widget.allowedOrigins as string[]) ?? [];
    if (allowed.length > 0 && (!origin || !allowed.includes(origin))) {
      throw new ForbiddenException('Este site não está autorizado a usar o webchat');
    }
    return row.widget;
  }

  async publicConfig(publicKey: string, origin: string | undefined) {
    const widget = await this.getPublicWidget(publicKey, origin);
    const [agent] = await this.db
      .select({ name: agents.name, status: agents.status })
      .from(agents)
      .where(and(eq(agents.id, widget.agentId), isNull(agents.deletedAt)))
      .limit(1);
    return {
      title: widget.title,
      welcomeMessage: widget.welcomeMessage,
      primaryColor: widget.primaryColor,
      agentName: agent?.name ?? null,
      online:
        agent?.status === 'published' &&
        (await this.planLimits.isWithinPlan(widget.tenantId, 'agents', widget.agentId)),
    };
  }

  async startSession(publicKey: string, origin: string | undefined, visitorName?: string) {
    const widget = await this.getPublicWidget(publicKey, origin);
    const token = crypto.randomBytes(32).toString('base64url');
    const name = visitorName?.trim().slice(0, 80) || null;
    const [firstName, ...rest] = (name ?? '').split(' ');

    const conversationId = await this.db.transaction(async (tx) => {
      const [contact] = await tx
        .insert(contacts)
        .values({
          tenantId: widget.tenantId,
          firstName: firstName || null,
          lastName: rest.length > 0 ? rest.join(' ') : null,
          origin: 'webchat',
        })
        .returning({ id: contacts.id });
      const [conv] = await tx
        .insert(conversations)
        .values({
          tenantId: widget.tenantId,
          agentId: widget.agentId,
          contactId: contact!.id,
          channel: WEBCHAT_CHANNEL,
          channelConversationId: widget.id,
          status: 'open',
          metadata: { webchat: { widgetId: widget.id, tokenHash: sha256(token), origin: origin ?? null } },
        })
        .returning({ id: conversations.id });
      return conv!.id;
    });

    void this.webhooks.emit(widget.tenantId, 'conversation.created', {
      conversationId,
      channel: WEBCHAT_CHANNEL,
      widgetId: widget.id,
      agentId: widget.agentId,
    });
    return { session: `${conversationId}.${token}`, welcomeMessage: widget.welcomeMessage };
  }

  /** Valida o cabeçalho de sessão do visitante: `<conversationId>.<token>`. */
  private async getSessionConversation(widget: WebchatWidget, session: string | undefined) {
    const [conversationId, token] = (session ?? '').split('.');
    if (!conversationId || !token) throw new UnauthorizedException('Sessão de webchat inválida');
    const [conv] = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.tenantId, widget.tenantId),
          eq(conversations.channel, WEBCHAT_CHANNEL),
        ),
      )
      .limit(1);
    const meta = (conv?.metadata ?? {}) as WebchatMetadata;
    const expected = meta.webchat?.tokenHash;
    const given = sha256(token);
    if (
      !conv ||
      meta.webchat?.widgetId !== widget.id ||
      !expected ||
      expected.length !== given.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))
    ) {
      throw new UnauthorizedException('Sessão de webchat inválida');
    }
    return conv;
  }

  async listMessages(publicKey: string, origin: string | undefined, session: string | undefined, after?: string) {
    const widget = await this.getPublicWidget(publicKey, origin);
    const conv = await this.getSessionConversation(widget, session);
    const afterDate = after ? new Date(after) : null;
    const rows = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conv.id),
          eq(messages.tenantId, widget.tenantId),
          ...(afterDate && !Number.isNaN(afterDate.getTime()) ? [gt(messages.createdAt, afterDate)] : []),
        ),
      )
      .orderBy(asc(messages.createdAt))
      .limit(200);
    return rows.map((m) => this.toVisitorMessage(m));
  }

  private toVisitorMessage(m: typeof messages.$inferSelect): VisitorMessage {
    return {
      id: m.id,
      from: m.direction === 'inbound' ? 'visitor' : m.isAiGenerated ? 'agent' : 'human',
      text: messageText(m.content),
      createdAt: m.createdAt,
    };
  }

  async sendMessage(publicKey: string, origin: string | undefined, session: string | undefined, text: string) {
    const widget = await this.getPublicWidget(publicKey, origin);
    const conv = await this.getSessionConversation(widget, session);
    const body = text.trim();
    if (!body) throw new BadRequestException('Mensagem vazia');
    if (conv.status === 'resolved' || conv.status === 'opted_out') {
      throw new BadRequestException('Esta conversa foi encerrada. Recarregue a página para iniciar outra.');
    }

    const [{ value: sent } = { value: 0 }] = await this.db
      .select({ value: count() })
      .from(messages)
      .where(and(eq(messages.conversationId, conv.id), eq(messages.direction, 'inbound')));
    if (Number(sent) >= MAX_VISITOR_MESSAGES_PER_SESSION) {
      throw new HttpException('Limite de mensagens desta conversa atingido.', HttpStatus.TOO_MANY_REQUESTS);
    }

    /* Histórico anterior (para o contexto da IA) antes de gravar a nova mensagem */
    const previous = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.createdAt))
      .limit(HISTORY_LIMIT);

    const [inbound] = await this.db
      .insert(messages)
      .values({
        conversationId: conv.id,
        tenantId: widget.tenantId,
        direction: 'inbound',
        status: 'delivered',
        content: { text: body },
        isAiGenerated: false,
      })
      .returning();
    await this.db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date(), ...(conv.status === 'waiting_human' ? {} : { status: 'open' as const }) })
      .where(eq(conversations.id, conv.id));
    void this.webhooks.emit(widget.tenantId, 'message.received', {
      conversationId: conv.id,
      channel: WEBCHAT_CHANNEL,
      messageId: inbound!.id,
      text: body,
    });

    const replies: VisitorMessage[] = [];
    // Atendente humano assumiu: a IA não responde.
    if (conv.aiPausedAt) return { messages: [this.toVisitorMessage(inbound!)], aiPaused: true };

    const [agent] = await this.db
      .select({ id: agents.id, status: agents.status })
      .from(agents)
      .where(and(eq(agents.id, widget.agentId), eq(agents.tenantId, widget.tenantId), isNull(agents.deletedAt)))
      .limit(1);

    let replyText: string | null = null;
    let traceId: string | null = null;
    let aiGenerated = false;

    const agentAllowed = !!agent && (await this.planLimits.isWithinPlan(widget.tenantId, 'agents', agent.id));
    if (agent && agent.status === 'published' && agentAllowed) {
      try {
        const history = previous
          .reverse()
          .map((m) => ({ role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant', content: messageText(m.content) }))
          .filter((m) => m.content.length > 0);
        const result = await this.lab.chat(
          { agentId: agent.id, message: body, history },
          widget.tenantId,
          { conversationId: conv.id, contactId: conv.contactId },
        );
        replyText = result.reply || null;
        traceId = result.traceId;
        aiGenerated = true;
      } catch (err) {
        // Sem chave, sem crédito no provedor etc.: o visitante recebe aviso e a conversa vai para atendimento humano.
        const reason = err instanceof HttpException ? JSON.stringify(err.getResponse()) : String(err);
        this.logger.warn(`Webchat: IA indisponível (conversa ${conv.id}): ${reason.slice(0, 300)}`);
      }
    }

    if (!replyText) {
      replyText = UNAVAILABLE_REPLY;
      aiGenerated = false;
      await this.db
        .update(conversations)
        .set({ status: 'waiting_human', updatedAt: new Date() })
        .where(eq(conversations.id, conv.id));
    }

    const [outbound] = await this.db
      .insert(messages)
      .values({
        conversationId: conv.id,
        tenantId: widget.tenantId,
        direction: 'outbound',
        status: 'delivered',
        content: { text: replyText },
        sentByAgentId: aiGenerated ? widget.agentId : null,
        isAiGenerated: aiGenerated,
        traceId,
        sentAt: new Date(),
      })
      .returning();
    await this.db
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conv.id));
    replies.push(this.toVisitorMessage(outbound!));
    if (aiGenerated) {
      void this.webhooks.emit(widget.tenantId, 'message.replied', {
        conversationId: conv.id,
        channel: WEBCHAT_CHANNEL,
        messageId: outbound!.id,
        agentId: widget.agentId,
        text: replyText,
      });
    }

    return { messages: [this.toVisitorMessage(inbound!), ...replies], aiPaused: false };
  }
}
