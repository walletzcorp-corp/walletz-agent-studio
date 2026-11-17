import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, isNull, isNotNull, desc, asc } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { agents } from '../../database/schema/agents';
import { knowledgeItems } from '../../database/schema/knowledge';
import { labConversations, labMessages } from '../../database/schema/lab';
import type { LabConversation, LabMessage } from '../../database/schema/lab';
import { KnowledgeRetrievalService } from '../knowledge/knowledge-retrieval.service';
import { createId } from '../../database/utils/id';
import { SchedulingToolsService, type ToolContext } from '../calendars/scheduling-tools.service';
import { PcConnectorService } from '../pc-connector/pc-connector.service';
import { LlmUsageService } from '../../shared/llm-usage/llm-usage.service';
import type { LabChatDto, ChatMessageDto, CreateLabConversationDto, UpdateLabConversationDto } from './dto/chat.dto';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { LlmProviderError } from '../ai-providers/llm/llm.types';

interface ToolDef {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

const MAX_TOOL_ROUNDS = 8;
/** Máximo de mensagens do histórico enviadas ao LLM (janela de contexto). */
const MAX_CONTEXT_MESSAGES = 40;

export interface LabConversationView {
  id: string;
  agentId: string;
  agentName: string;
  agentVersion: string | null;
  title: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  messages: LabMessageView[];
}

export interface LabMessageView {
  id: string;
  role: string;
  content: string;
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  traceId: string | null;
  retrievedChunks: Array<{ content: string; source: string }> | null;
  toolCallsExecuted: string[] | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface LabConversationSummary {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  lastMessage: string | null;
}

export interface LabChatResult {
  traceId: string;
  reply: string;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
  retrievedChunks: Array<{ content: string; source: string }>;
  toolCallsExecuted?: string[];
  labConversationId: string;
  userMessageId: string;
  assistantMessageId: string;
}

const TEST_SYSTEM = 'Você está sendo testado pela plataforma Walletz. Responda apenas: OK';

const SCHEDULING_TOOLS: ToolDef[] = [
  {
    name: 'get_availability',
    description:
      'Consulta os horários disponíveis para agendamento. Use quando o cliente demonstrar intenção de marcar, reagendar ou verificar disponibilidade para uma reunião. Retorna slots livres reais.',
    input_schema: {
      type: 'object' as const,
      properties: { days_ahead: { type: 'number', description: 'Quantos dias à frente consultar (padrão: 7)' } },
      required: [],
    },
  },
  {
    name: 'create_meeting',
    description:
      'Cria uma reunião REAL no calendário e gera o link (Google Meet ou Teams). Use SOMENTE após o cliente confirmar explicitamente o horário escolhido. Nunca crie sem confirmação.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_at: { type: 'string', description: 'Data/hora de início em ISO 8601 (ex: 2026-10-07T14:00:00-03:00)' },
        end_at: { type: 'string', description: 'Data/hora de término em ISO 8601' },
        title: { type: 'string', description: 'Título da reunião' },
        description: { type: 'string', description: 'Descrição opcional' },
        contact_name: { type: 'string', description: 'Nome completo do cliente' },
        contact_email: { type: 'string', description: 'E-mail do cliente' },
        platform: { type: 'string', enum: ['google_meet', 'teams', 'presencial', 'phone'], description: 'Plataforma' },
        timezone: { type: 'string', description: 'Fuso horário (ex: America/Sao_Paulo)' },
      },
      required: ['start_at', 'end_at', 'title'],
    },
  },
  {
    name: 'find_meetings',
    description: 'Busca reuniões existentes do contato ou da conversa. Use antes de reagendar ou cancelar.',
    input_schema: {
      type: 'object' as const,
      properties: { status: { type: 'string', enum: ['confirmed', 'pending', 'all'], description: 'Filtrar por status' } },
      required: [],
    },
  },
  {
    name: 'reschedule_meeting',
    description: 'Reagenda uma reunião existente. Cancela o anterior e cria novo. Use após o cliente confirmar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        meeting_id: { type: 'string', description: 'ID da reunião' },
        new_start_at: { type: 'string', description: 'Novo início (ISO 8601)' },
        new_end_at: { type: 'string', description: 'Novo término (ISO 8601)' },
        reason: { type: 'string', description: 'Motivo' },
      },
      required: ['meeting_id', 'new_start_at', 'new_end_at'],
    },
  },
  {
    name: 'cancel_meeting',
    description: 'Cancela uma reunião e remove o evento externo. Confirme com o cliente antes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        meeting_id: { type: 'string', description: 'ID da reunião' },
        reason: { type: 'string', description: 'Motivo' },
      },
      required: ['meeting_id'],
    },
  },
];

@Injectable()
export class LabService {
  private readonly logger = new Logger(LabService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly schedulingTools: SchedulingToolsService,
    private readonly pcConnector: PcConnectorService,
    private readonly llmUsage: LlmUsageService,
    private readonly aiProviders: AiProvidersService,
    private readonly retrieval: KnowledgeRetrievalService,
  ) {}

  /* ── Gestão de conversas ─────────────────────────────────────────────────── */

  async createConversation(
    tenantId: string,
    userId: string,
    dto: CreateLabConversationDto,
  ): Promise<LabConversationView> {
    const [agent] = await this.db
      .select({ id: agents.id, name: agents.name, status: agents.status })
      .from(agents)
      .where(and(eq(agents.id, dto.agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);

    if (!agent) throw new NotFoundException('Agent not found');

    const title = dto.title?.trim() || 'Nova conversa';
    const [conv] = await this.db
      .insert(labConversations)
      .values({ tenantId, userId, agentId: agent.id, agentVersion: agent.status, title })
      .returning();

    this.logger.log(`LAB_CONVERSATION_CREATED tenantId=${tenantId} userId=${userId} agentId=${agent.id} id=${conv!.id}`);

    return this.toView(conv!, agent.name, []);
  }

  async listConversations(
    tenantId: string,
    userId: string,
    agentId?: string,
    limit = 20,
    cursor?: string,
  ): Promise<LabConversationSummary[]> {
    const rows = await this.db
      .select({
        conv: labConversations,
        agentName: agents.name,
      })
      .from(labConversations)
      .innerJoin(agents, eq(agents.id, labConversations.agentId))
      .where(
        and(
          eq(labConversations.tenantId, tenantId),
          eq(labConversations.userId, userId),
          isNull(labConversations.deletedAt),
          agentId ? eq(labConversations.agentId, agentId) : undefined,
        ),
      )
      .orderBy(desc(labConversations.lastMessageAt), desc(labConversations.createdAt))
      .limit(limit);

    // Buscar última mensagem de cada conversa para preview
    const summaries: LabConversationSummary[] = [];
    for (const { conv, agentName } of rows) {
      const [lastMsg] = await this.db
        .select({ content: labMessages.content, role: labMessages.role })
        .from(labMessages)
        .where(eq(labMessages.conversationId, conv.id))
        .orderBy(desc(labMessages.createdAt))
        .limit(1);

      summaries.push({
        id: conv.id,
        agentId: conv.agentId,
        agentName,
        title: conv.title,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        lastMessage: lastMsg?.role === 'user' ? lastMsg.content.slice(0, 100) : null,
      });
    }

    return summaries;
  }

  async getLatestConversation(
    tenantId: string,
    userId: string,
    agentId: string,
  ): Promise<LabConversationView | null> {
    const [row] = await this.db
      .select({ conv: labConversations, agentName: agents.name })
      .from(labConversations)
      .innerJoin(agents, eq(agents.id, labConversations.agentId))
      .where(
        and(
          eq(labConversations.tenantId, tenantId),
          eq(labConversations.userId, userId),
          eq(labConversations.agentId, agentId),
          isNull(labConversations.deletedAt),
        ),
      )
      .orderBy(desc(labConversations.lastMessageAt), desc(labConversations.createdAt))
      .limit(1);

    if (!row) return null;

    this.logger.log(`LAB_CONVERSATION_LOADED id=${row.conv.id} tenantId=${tenantId} userId=${userId}`);
    return this.loadConversationWithMessages(row.conv, row.agentName);
  }

  async getConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
  ): Promise<LabConversationView> {
    const row = await this.assertOwnership(tenantId, userId, conversationId);
    this.logger.log(`LAB_CONVERSATION_LOADED id=${conversationId} tenantId=${tenantId} userId=${userId}`);
    return this.loadConversationWithMessages(row.conv, row.agentName);
  }

  async updateConversation(
    tenantId: string,
    userId: string,
    conversationId: string,
    dto: UpdateLabConversationDto,
  ): Promise<LabConversationView> {
    const row = await this.assertOwnership(tenantId, userId, conversationId);
    const patch: Partial<LabConversation> = { updatedAt: new Date() };
    if (dto.title !== undefined) patch.title = dto.title.trim() || 'Nova conversa';

    await this.db
      .update(labConversations)
      .set(patch)
      .where(eq(labConversations.id, conversationId));

    return this.loadConversationWithMessages(row.conv, row.agentName);
  }

  async deleteConversation(tenantId: string, userId: string, conversationId: string): Promise<void> {
    await this.assertOwnership(tenantId, userId, conversationId);
    await this.db
      .update(labConversations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(labConversations.id, conversationId));
    this.logger.log(`LAB_CONVERSATION_DELETED id=${conversationId} tenantId=${tenantId} userId=${userId}`);
  }

  /* ── Chat com persistência ───────────────────────────────────────────────── */

  async chat(
    dto: LabChatDto,
    tenantId: string,
    /** userId presente: modo Laboratório — persiste conversa no banco.
     *  userId ausente: chamada interna (webchat, whatsapp) — apenas executa LLM. */
    userId: string | undefined,
    options?: { conversationId?: string; contactId?: string },
  ): Promise<LabChatResult> {
    const traceId = createId();
    const persistLab = !!userId;

    /* Carrega agente */
    const [agent] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, dto.agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);

    if (!agent) throw new NotFoundException('Agent not found');

    /* Resolve chave de IA (BYOK) */
    const llm = await this.aiProviders.resolveForAgent(tenantId, agent.aiConnectionId);

    await this.llmUsage.assertWithinMonthlyLimit(tenantId);

    /* Persistência de conversa no banco (somente modo Laboratório) */
    let conv: LabConversation | null = null;
    let userMsg: LabMessage | null = null;

    if (persistLab) {
      if (dto.labConversationId) {
        const row = await this.assertOwnership(tenantId, userId!, dto.labConversationId);
        if (row.conv.agentId !== dto.agentId) {
          throw new ForbiddenException('Conversation belongs to a different agent');
        }
        conv = row.conv;
      } else {
        const [inserted] = await this.db
          .insert(labConversations)
          .values({
            tenantId,
            userId: userId!,
            agentId: agent.id,
            agentVersion: agent.status,
            title: this.autoTitle(dto.message),
          })
          .returning();
        conv = inserted!;

        if (dto.history && dto.history.length > 0) {
          await this.persistMessages(conv.id, tenantId, dto.history);
        }
      }

      /* Persiste mensagem do usuário ANTES de chamar a IA */
      const [inserted] = await this.db
        .insert(labMessages)
        .values({ conversationId: conv!.id, tenantId, role: 'user', content: dto.message })
        .returning();
      userMsg = inserted!;
      this.logger.log(`LAB_MESSAGE_CREATED role=user conversationId=${conv!.id} tenantId=${tenantId}`);
    }

    /* Carrega histórico do banco (modo lab) ou usa history inline (modo webhook) */
    let contextHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    if (persistLab && conv) {
      const historyRows = await this.db
        .select()
        .from(labMessages)
        .where(eq(labMessages.conversationId, conv.id))
        .orderBy(asc(labMessages.createdAt));

      contextHistory = historyRows
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.id !== userMsg?.id)
        .slice(-MAX_CONTEXT_MESSAGES)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    } else {
      contextHistory = (dto.history ?? [])
        .slice(-MAX_CONTEXT_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content }));
    }

    /* RAG */
    const retrievedChunks = await this.retrieveRelevantChunks(dto.message, tenantId, dto.agentId);

    /* Base de conhecimento */
    const approvedItems = await this.db
      .select()
      .from(knowledgeItems)
      .where(and(eq(knowledgeItems.tenantId, tenantId), isNotNull(knowledgeItems.approvedAt), isNull(knowledgeItems.deletedAt)))
      .limit(50);

    const agentSettings = await this.schedulingTools.loadSettings(dto.agentId, tenantId);
    const schedulingEnabled = agentSettings?.canSchedule === true;
    const pcDevicesList = await this.pcConnector.listDevices(tenantId);
    const onlineDevice = pcDevicesList.find(
      (d: { pairedAt: Date | null; lastSeenAt: Date | null }) => d.pairedAt && d.lastSeenAt && Date.now() - d.lastSeenAt.getTime() < 30_000,
    ) as (typeof pcDevicesList)[0] | undefined;
    const pcEnabled = !!onlineDevice;

    const systemPrompt = this.buildSystemPrompt(
      agent,
      approvedItems,
      retrievedChunks,
      schedulingEnabled ? agentSettings : null,
      pcEnabled ? onlineDevice : null,
    );

    const toolDefs: ToolDef[] = [
      ...(schedulingEnabled ? SCHEDULING_TOOLS : []),
      ...(pcEnabled ? buildPcTools(onlineDevice!.id, onlineDevice!.capabilities as Record<string, unknown>) : []),
    ];
    const toolCtx: ToolContext = {
      tenantId,
      agentId: dto.agentId,
      conversationId: options?.conversationId,
      contactId: options?.contactId,
    };

    const session = llm.adapter.createSession({
      apiKey: llm.apiKey,
      model: llm.model,
      system: systemPrompt,
      history: [
        ...contextHistory,
        { role: 'user' as const, content: dto.message },
      ],
      tools: toolDefs.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: { properties: t.input_schema.properties, required: t.input_schema.required ?? [] },
      })),
      maxTokens: 2048,
      onResponseHeaders: (headers) => this.aiProviders.recordResponseHeaders(llm.connectionId, headers),
    });

    const toolCallsExecuted: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      let turn = await session.send();
      totalInputTokens += turn.inputTokens;
      totalOutputTokens += turn.outputTokens;

      let rounds = 0;
      while (turn.toolCalls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
        rounds += 1;
        const results: Array<{ id: string; output: string }> = [];

        for (const call of turn.toolCalls) {
          this.logger.debug(`Tool call: ${call.name}`);
          toolCallsExecuted.push(call.name);

          let toolOutput: unknown;
          try {
            if (call.name.startsWith('pc.') && onlineDevice) {
              toolOutput = await this.pcConnector.enqueueCommand(tenantId, onlineDevice.id, call.name, call.input, dto.agentId);
            } else {
              toolOutput = await this.schedulingTools.dispatch(call.name, call.input, toolCtx);
            }
          } catch (err) {
            toolOutput = { error: err instanceof Error ? err.message : String(err) };
          }
          results.push({ id: call.id, output: JSON.stringify(toolOutput) });
        }

        session.addToolResults(results);
        turn = await session.send();
        totalInputTokens += turn.inputTokens;
        totalOutputTokens += turn.outputTokens;
      }

      await this.llmUsage.recordUsage({
        tenantId,
        agentId: dto.agentId,
        model: `${llm.provider}/${llm.model}`,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        source: 'lab',
        traceId,
      });

      let assistantMsgId: string | undefined;

      if (persistLab && conv) {
        /* Persiste resposta do assistant */
        const [assistantMsg] = await this.db
          .insert(labMessages)
          .values({
            conversationId: conv.id,
            tenantId,
            role: 'assistant',
            content: turn.text,
            provider: llm.provider,
            model: llm.model,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            traceId,
            retrievedChunks: retrievedChunks.length > 0
              ? retrievedChunks.map((c) => ({ content: c.content, source: c.sourceName }))
              : null,
            toolCallsExecuted: toolCallsExecuted.length > 0 ? toolCallsExecuted : null,
          })
          .returning();

        assistantMsgId = assistantMsg!.id;
        this.logger.log(`LAB_MESSAGE_CREATED role=assistant conversationId=${conv.id} tenantId=${tenantId}`);

        /* Atualiza lastMessageAt e título automático */
        const now = new Date();
        const titleUpdate: Partial<LabConversation> = { lastMessageAt: now, updatedAt: now };
        if (conv.title === 'Nova conversa') {
          titleUpdate.title = this.autoTitle(dto.message);
        }
        await this.db.update(labConversations).set(titleUpdate).where(eq(labConversations.id, conv.id));
      }

      return {
        traceId,
        reply: turn.text,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        provider: llm.provider,
        model: llm.model,
        retrievedChunks: retrievedChunks.map((c) => ({ content: c.content, source: c.sourceName })),
        toolCallsExecuted: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
        labConversationId: conv?.id ?? '',
        userMessageId: userMsg?.id ?? '',
        assistantMessageId: assistantMsgId ?? '',
      };
    } catch (err) {
      if (persistLab && conv) {
        /* Registra erro no banco (mensagem do usuário já estava salva) */
        await this.db.insert(labMessages).values({
          conversationId: conv.id,
          tenantId,
          role: 'error',
          content: '',
          errorMessage: err instanceof Error ? err.message : String(err),
          traceId,
        });
        await this.db.update(labConversations).set({ updatedAt: new Date() }).where(eq(labConversations.id, conv.id));
      }

      if (err instanceof LlmProviderError) {
        this.logger.warn(`LLM call failed (trace ${traceId}): ${err.message}`);
        throw await this.aiProviders.handleProviderFailure(tenantId, llm.connectionId, err, llm.model);
      }
      throw err;
    }
  }

  /* ── Helpers ─────────────────────────────────────────────────────────────── */

  private async assertOwnership(
    tenantId: string,
    userId: string,
    conversationId: string,
  ): Promise<{ conv: LabConversation; agentName: string }> {
    const [row] = await this.db
      .select({ conv: labConversations, agentName: agents.name })
      .from(labConversations)
      .innerJoin(agents, eq(agents.id, labConversations.agentId))
      .where(
        and(
          eq(labConversations.id, conversationId),
          eq(labConversations.tenantId, tenantId),
          eq(labConversations.userId, userId),
          isNull(labConversations.deletedAt),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Lab conversation not found');
    return row;
  }

  private async loadConversationWithMessages(conv: LabConversation, agentName: string): Promise<LabConversationView> {
    const msgs = await this.db
      .select()
      .from(labMessages)
      .where(eq(labMessages.conversationId, conv.id))
      .orderBy(asc(labMessages.createdAt));

    return this.toView(conv, agentName, msgs);
  }

  private toView(conv: LabConversation, agentName: string, msgs: LabMessage[]): LabConversationView {
    return {
      id: conv.id,
      agentId: conv.agentId,
      agentName,
      agentVersion: conv.agentVersion,
      title: conv.title,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        provider: m.provider,
        model: m.model,
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        traceId: m.traceId,
        retrievedChunks: m.retrievedChunks as Array<{ content: string; source: string }> | null,
        toolCallsExecuted: m.toolCallsExecuted as string[] | null,
        errorMessage: m.errorMessage,
        createdAt: m.createdAt,
      })),
    };
  }

  private async persistMessages(
    conversationId: string,
    tenantId: string,
    messages: ChatMessageDto[],
  ): Promise<void> {
    for (const m of messages) {
      await this.db.insert(labMessages).values({ conversationId, tenantId, role: m.role, content: m.content });
    }
  }

  private autoTitle(firstMessage: string): string {
    const clean = firstMessage.trim().replace(/\s+/g, ' ');
    return clean.length <= 60 ? clean : clean.slice(0, 57) + '…';
  }

  private async retrieveRelevantChunks(
    query: string,
    tenantId: string,
    agentId: string,
  ): Promise<Array<{ content: string; sourceName: string }>> {
    const hits = await this.retrieval.search(tenantId, agentId, query, 5);
    return hits.map((h) => ({ content: h.content.slice(0, 1500), sourceName: h.sourceName }));
  }

  private buildSystemPrompt(
    agent: { name: string; objective: string | null; tone: string | null; language: string | null; persona: unknown },
    knowledgeItemsList: Array<{ type: string; content: string; context: string | null }>,
    chunks: Array<{ content: string; sourceName: string }>,
    schedulingSettings: { defaultDurationMinutes: number; defaultPlatform: string; timeZone: string } | null,
    pcDevice: { deviceName: string; authorizedPaths: unknown; authorizedApps: unknown } | null = null,
  ): string {
    const persona = typeof agent.persona === 'object' && agent.persona !== null
      ? (agent.persona as { name?: string; description?: string })
      : {};

    const parts: string[] = [`Você é ${persona.name ?? agent.name}, um assistente de IA.`];

    if (agent.objective) parts.push(`\nSeu objetivo: ${agent.objective}`);
    if (agent.tone) parts.push(`\nTom de comunicação: ${agent.tone}`);
    if (agent.language) parts.push(`\nIdioma principal: ${agent.language}`);

    if (schedulingSettings) {
      parts.push(`
## Capacidade de Agendamento

Você pode agendar reuniões reais usando as ferramentas disponíveis. Siga SEMPRE estas regras:

1. **Detectar intenção**: Reconheça intenção de agendamento mesmo sem uso da palavra "agenda".
2. **Coletar informações**: Nome do cliente e assunto. E-mail para convite.
3. **Consultar disponibilidade REAL**: Use \`get_availability\`. NUNCA invente horários.
4. **Confirmar antes de criar**: Só chame \`create_meeting\` após confirmação explícita.
5. **Configurações**: Duração: ${schedulingSettings.defaultDurationMinutes}min · Plataforma: ${schedulingSettings.defaultPlatform} · Fuso: ${schedulingSettings.timeZone}
6. **Transparência**: Se falhar, informe o cliente. Nunca confirme reunião não criada.`);
    }

    if (knowledgeItemsList.length > 0) {
      parts.push('\n\n## Conhecimento e Regras\n');
      const facts = knowledgeItemsList.filter((i) => i.type === 'fact');
      const guidance = knowledgeItemsList.filter((i) => i.type === 'guidance');
      const procedures = knowledgeItemsList.filter((i) => i.type === 'procedure');
      const permissions = knowledgeItemsList.filter((i) => i.type === 'permission');

      if (facts.length > 0) parts.push('### Fatos\n' + facts.map((i) => `- ${i.content}${i.context ? ` (${i.context})` : ''}`).join('\n'));
      if (guidance.length > 0) parts.push('### Diretrizes\n' + guidance.map((i) => `- ${i.content}`).join('\n'));
      if (procedures.length > 0) parts.push('### Procedimentos\n' + procedures.map((i) => `- ${i.content}`).join('\n'));
      if (permissions.length > 0) parts.push('### Permissões\n' + permissions.map((i) => `- ${i.content}`).join('\n'));
    }

    if (chunks.length > 0) {
      parts.push('\n\n## Base de Conhecimento Relevante\n');
      chunks.forEach((c, i) => {
        parts.push(`### Trecho ${i + 1} (${c.sourceName})\n${c.content}`);
      });
    }

    if (pcDevice) {
      const paths = Array.isArray(pcDevice.authorizedPaths) ? (pcDevice.authorizedPaths as string[]).join(', ') : '';
      const apps = Array.isArray(pcDevice.authorizedApps) ? (pcDevice.authorizedApps as string[]).join(', ') : '';
      parts.push(`
## Acesso ao Computador

Você está conectado ao computador "${pcDevice.deviceName}".
- SOMENTE opere dentro das pastas autorizadas: ${paths}
- SOMENTE abra estes aplicativos: ${apps}
- NUNCA acesse senhas, tokens ou dados fora das áreas permitidas
- SEMPRE confirme antes de ações destrutivas`);
    }

    parts.push('\n\nSempre responda no idioma do usuário. Seja claro, objetivo e útil.');

    return parts.join('\n');
  }
}

function buildPcTools(deviceId: string, capabilities: Record<string, unknown>): ToolDef[] {
  const tools: ToolDef[] = [];
  const files = (capabilities.files ?? {}) as Record<string, boolean>;
  const appsCapabilities = (capabilities.apps ?? {}) as Record<string, boolean>;
  const browser = (capabilities.browser ?? {}) as Record<string, boolean>;
  const system = (capabilities.system ?? {}) as Record<string, boolean>;

  if (files.read !== false) {
    tools.push({
      name: 'pc.listFiles',
      description: 'Lista arquivos e pastas em um diretório autorizado do computador conectado.',
      input_schema: { type: 'object' as const, properties: { path: { type: 'string' }, device_id: { type: 'string', default: deviceId } }, required: ['path'] },
    });
    tools.push({
      name: 'pc.readFile',
      description: 'Lê o conteúdo de um arquivo de texto no computador conectado.',
      input_schema: { type: 'object' as const, properties: { path: { type: 'string' }, device_id: { type: 'string', default: deviceId } }, required: ['path'] },
    });
  }

  if (files.create !== false) {
    tools.push({
      name: 'pc.createFile',
      description: 'Cria um arquivo de texto no computador conectado.',
      input_schema: { type: 'object' as const, properties: { path: { type: 'string' }, content: { type: 'string' }, device_id: { type: 'string', default: deviceId } }, required: ['path', 'content'] },
    });
    tools.push({
      name: 'pc.createFolder',
      description: 'Cria uma pasta no computador conectado.',
      input_schema: { type: 'object' as const, properties: { path: { type: 'string' }, device_id: { type: 'string', default: deviceId } }, required: ['path'] },
    });
  }

  if (files.rename) {
    tools.push({
      name: 'pc.renameFile',
      description: 'Renomeia um arquivo ou pasta no computador conectado.',
      input_schema: { type: 'object' as const, properties: { path: { type: 'string' }, new_name: { type: 'string' }, device_id: { type: 'string', default: deviceId } }, required: ['path', 'new_name'] },
    });
  }

  if (files.move) {
    tools.push({
      name: 'pc.moveFile',
      description: 'Move um arquivo ou pasta.',
      input_schema: { type: 'object' as const, properties: { source: { type: 'string' }, destination: { type: 'string' }, device_id: { type: 'string', default: deviceId } }, required: ['source', 'destination'] },
    });
  }

  if (appsCapabilities.open) {
    tools.push({
      name: 'pc.openApplication',
      description: 'Abre um aplicativo autorizado.',
      input_schema: { type: 'object' as const, properties: { app: { type: 'string' }, device_id: { type: 'string', default: deviceId } }, required: ['app'] },
    });
  }

  if (browser.openUrl !== false) {
    tools.push({
      name: 'pc.openUrl',
      description: 'Abre uma URL no navegador.',
      input_schema: { type: 'object' as const, properties: { url: { type: 'string' }, device_id: { type: 'string', default: deviceId } }, required: ['url'] },
    });
  }

  if (system.info !== false) {
    tools.push({
      name: 'pc.getDeviceInfo',
      description: 'Obtém informações básicas do computador conectado.',
      input_schema: { type: 'object' as const, properties: { device_id: { type: 'string', default: deviceId } }, required: [] },
    });
  }

  return tools;
}
