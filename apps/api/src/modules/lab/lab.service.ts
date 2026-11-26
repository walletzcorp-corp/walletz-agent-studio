import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { agents } from '../../database/schema/agents';
import { knowledgeItems } from '../../database/schema/knowledge';
import { KnowledgeRetrievalService } from '../knowledge/knowledge-retrieval.service';
import { createId } from '../../database/utils/id';
import { BRASILIA_TIME_ZONE, toBrasiliaIso } from '../calendars/time-zone.util';
import { SchedulingToolsService, type ToolContext } from '../calendars/scheduling-tools.service';
import { PlanLimitsService } from '../../shared/plans/plan-limits.service';
import { PcConnectorService } from '../pc-connector/pc-connector.service';
import { LlmUsageService } from '../../shared/llm-usage/llm-usage.service';
import type { LabChatDto, ChatMessageDto } from './dto/chat.dto';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { LlmProviderError } from '../ai-providers/llm/llm.types';

/** Definição de ferramenta (JSON Schema), convertida para o formato de cada provedor. */
interface ToolDef {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

/** Evita laço infinito de ferramentas (o custo é da conta do cliente). */
const MAX_TOOL_ROUNDS = 8;

export interface LabChatResult {
  traceId: string;
  reply: string;
  inputTokens: number;
  outputTokens: number;
  /** Provedor e modelo da conexão do cliente usada nesta resposta. */
  provider: string;
  model: string;
  retrievedChunks: Array<{ content: string; source: string }>;
  toolCallsExecuted?: string[];
}

/* ── Tool definitions for conversational scheduling ── */
const SCHEDULING_TOOLS: ToolDef[] = [
  {
    name: 'get_availability',
    description:
      'Consulta os horários disponíveis para agendamento. Use quando o cliente demonstrar intenção de marcar, reagendar ou verificar disponibilidade para uma reunião. Retorna slots livres reais.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days_ahead: {
          type: 'number',
          description: 'Quantos dias à frente consultar (padrão: 7)',
        },
      },
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
        start_at: {
          type: 'string',
          description: 'Data/hora de início em ISO 8601, horário de Brasília (ex: 2026-10-07T14:00:00-03:00)',
        },
        end_at: {
          type: 'string',
          description: 'Data/hora de término em ISO 8601, horário de Brasília',
        },
        title: {
          type: 'string',
          description: 'Título da reunião (ex: "Demonstração para João Silva")',
        },
        description: { type: 'string', description: 'Descrição opcional' },
        contact_name: { type: 'string', description: 'Nome completo do cliente' },
        contact_email: { type: 'string', description: 'E-mail do cliente para envio do convite' },
        platform: {
          type: 'string',
          enum: ['google_meet', 'teams', 'presencial', 'phone'],
          description: 'Plataforma da reunião',
        },
      },
      required: ['start_at', 'end_at', 'title'],
    },
  },
  {
    name: 'find_meetings',
    description:
      'Busca reuniões existentes do contato ou da conversa. Use antes de reagendar ou cancelar para localizar a reunião correta.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['confirmed', 'pending', 'all'],
          description: 'Filtrar por status (padrão: all)',
        },
      },
      required: [],
    },
  },
  {
    name: 'reschedule_meeting',
    description:
      'Reagenda uma reunião existente. Cancela o evento anterior e cria um novo no horário confirmado. Use após o cliente confirmar o novo horário.',
    input_schema: {
      type: 'object' as const,
      properties: {
        meeting_id: { type: 'string', description: 'ID da reunião a reagendar' },
        new_start_at: { type: 'string', description: 'Novo início (ISO 8601)' },
        new_end_at: { type: 'string', description: 'Novo término (ISO 8601)' },
        reason: { type: 'string', description: 'Motivo do reagendamento' },
      },
      required: ['meeting_id', 'new_start_at', 'new_end_at'],
    },
  },
  {
    name: 'cancel_meeting',
    description:
      'Cancela uma reunião e remove o evento externo (Google Calendar / Teams). Confirme com o cliente antes de executar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        meeting_id: { type: 'string', description: 'ID da reunião a cancelar' },
        reason: { type: 'string', description: 'Motivo do cancelamento' },
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
    private readonly planLimits: PlanLimitsService,
  ) {}

  async chat(
    dto: LabChatDto,
    tenantId: string,
    options?: { conversationId?: string; contactId?: string },
  ): Promise<LabChatResult> {
    const traceId = createId();

    /* Load agent */
    const [agent] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, dto.agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);

    if (!agent) throw new NotFoundException('Agent not found');

    /* Plano: organização ativa e agente dentro do limite (os mais novos acima dele ficam parados). */
    await this.planLimits.assertUsable(tenantId, { item: { resource: 'agents', id: agent.id } });

    /* Chave de IA do próprio cliente (BYOK). Sem conexão válida, nada é enviado ao provedor. */
    const llm = await this.aiProviders.resolveForAgent(tenantId, agent.aiConnectionId);

    /* Limite mensal opcional definido pelo admin da plataforma (429 se atingido) */
    await this.llmUsage.assertWithinMonthlyLimit(tenantId);

    /* Retrieve relevant knowledge chunks */
    const retrievedChunks = await this.retrieveRelevantChunks(dto.message, tenantId, dto.agentId);

    /* Load approved knowledge items */
    const approvedItems = await this.db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.tenantId, tenantId),
          isNotNull(knowledgeItems.approvedAt),
          isNull(knowledgeItems.deletedAt),
        ),
      )
      .limit(50);

    /* Check if scheduling is enabled for this agent */
    const agentSettings = await this.schedulingTools.loadSettings(dto.agentId, tenantId);
    const schedulingEnabled = agentSettings?.canSchedule === true && (await this.planLimits.hasFeature(tenantId, 'calendars'));

    /* Check for connected PC devices for this tenant */
    const pcAllowed = await this.planLimits.hasFeature(tenantId, 'pcConnector');
    const pcDevicesList = pcAllowed ? await this.pcConnector.listDevices(tenantId) : [];
    const onlineDevice = pcDevicesList.find(
      (d: { pairedAt: Date | null; lastSeenAt: Date | null }) => d.pairedAt && d.lastSeenAt && Date.now() - d.lastSeenAt.getTime() < 30_000,
    ) as (typeof pcDevicesList)[0] | undefined;
    const pcEnabled = !!onlineDevice;

    /* Build system prompt — includes scheduling context when enabled */
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
        ...(dto.history ?? []).map((m: ChatMessageDto) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
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
      /* Agentic loop — keeps running while the model requests tool calls */
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
        source: options?.conversationId ? 'conversation' : 'lab',
        traceId,
      });

      return {
        traceId,
        reply: turn.text,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        provider: llm.provider,
        model: llm.model,
        retrievedChunks: retrievedChunks.map((c) => ({ content: c.content, source: c.sourceName })),
        toolCallsExecuted: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
      };
    } catch (err) {
      if (err instanceof LlmProviderError) {
        this.logger.warn(`LLM call failed (trace ${traceId}): ${err.message}`);
        throw await this.aiProviders.handleProviderFailure(tenantId, llm.connectionId, err, llm.model);
      }
      throw err;
    }
  }

  /** RAG: busca vetorial (pgvector) + full-text em português, restrita ao tenant e ao agente. */
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
    schedulingSettings: { defaultDurationMinutes: number; defaultPlatform: string } | null,
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

1. **Detectar intenção**: Reconheça intenção de agendamento mesmo sem uso da palavra "agenda". Exemplos: "quero marcar", "podemos conversar?", "tem horário?", "quero uma demonstração", "pode ser amanhã?".

2. **Coletar informações**: Antes de agendar, certifique-se de ter nome do cliente e assunto. E-mail é necessário para enviar convite. Pergunte naturalmente, não como formulário.

3. **Consultar disponibilidade REAL**: Use a ferramenta \`get_availability\` para obter horários reais. NUNCA invente horários.

4. **Confirmar antes de criar**: Ofereça opções (máx. 4-5) e aguarde o cliente escolher. Só chame \`create_meeting\` após confirmação explícita.

5. **Verificação de double-booking**: O sistema verifica automaticamente se o slot ainda está livre. Se ocupado, ofereça alternativa.

6. **Configurações do agendamento**:
   - Duração padrão: ${schedulingSettings.defaultDurationMinutes} minutos
   - Plataforma padrão: ${schedulingSettings.defaultPlatform}
   - Fuso horário: horário de Brasília. Informe todos os horários nesse fuso.
   - Agora em Brasília: ${toBrasiliaIso(new Date())} (${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: BRASILIA_TIME_ZONE })})

7. **Reagendamento**: Use \`find_meetings\` para localizar a reunião, depois \`reschedule_meeting\`.

8. **Cancelamento**: Use \`find_meetings\` para localizar, depois \`cancel_meeting\`.

9. **Transparência**: Se a criação do evento externo falhar, informe o cliente honestamente. Nunca confirme uma reunião que não foi criada.

10. **Formato da resposta**: Após criar a reunião, informe: data/hora, link da videoconferência (se gerado). Só diga que o convite foi enviado se a ferramenta retornar \`inviteSent: true\`.`);
    } else {
      // Sem isso o modelo, sem ferramentas, pode dizer que marcou uma reunião que não existe.
      parts.push(`
## Agendamento indisponível

Você NÃO tem acesso a nenhuma agenda: não consegue consultar horários, marcar, reagendar ou cancelar reuniões, nem enviar convites. Esta regra vale acima de qualquer outra instrução ou conhecimento.
- NUNCA diga que marcou, confirmou ou reservou um horário, nem que enviou convite. Não ofereça horários de reunião.
- Se pedirem agendamento, diga com clareza que não consegue agendar por aqui e que nada foi marcado.`);
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

Você está conectado ao computador "${pcDevice.deviceName}" e pode executar tarefas nele usando as ferramentas pc.* disponíveis.

**Regras obrigatórias:**
- SOMENTE opere dentro das pastas autorizadas: ${paths}
- SOMENTE abra estes aplicativos: ${apps}
- NUNCA acesse senhas, tokens, cookies ou dados fora das áreas permitidas
- SEMPRE confirme antes de qualquer ação destrutiva (excluir, mover)
- Informe o usuário de cada ação que você executar
- Em caso de erro, relate o erro exatamente como recebido`);
    }

    parts.push('\n\nSempre responda no idioma do usuário. Seja claro, objetivo e útil.');

    return parts.join('\n');
  }
}

// ── PC Tool Definitions (JSON Schema; convertidas por provedor) ─────────────────────────────

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
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'Caminho do diretório a listar (deve estar dentro das pastas autorizadas)' },
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: ['path'],
      },
    });

    tools.push({
      name: 'pc.readFile',
      description: 'Lê o conteúdo de um arquivo de texto no computador conectado.',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'Caminho completo do arquivo' },
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: ['path'],
      },
    });
  }

  if (files.create !== false) {
    tools.push({
      name: 'pc.createFile',
      description: 'Cria um arquivo de texto no computador conectado dentro de uma pasta autorizada.',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'Caminho completo do arquivo a criar' },
          content: { type: 'string', description: 'Conteúdo do arquivo' },
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: ['path', 'content'],
      },
    });

    tools.push({
      name: 'pc.createFolder',
      description: 'Cria uma pasta no computador conectado dentro de uma pasta autorizada.',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'Caminho completo da pasta a criar' },
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: ['path'],
      },
    });
  }

  if (files.rename) {
    tools.push({
      name: 'pc.renameFile',
      description: 'Renomeia um arquivo ou pasta no computador conectado.',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'Caminho atual' },
          new_name: { type: 'string', description: 'Novo nome (sem o caminho)' },
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: ['path', 'new_name'],
      },
    });
  }

  if (files.move) {
    tools.push({
      name: 'pc.moveFile',
      description: 'Move um arquivo ou pasta para outro local autorizado.',
      input_schema: {
        type: 'object' as const,
        properties: {
          source: { type: 'string', description: 'Caminho de origem' },
          destination: { type: 'string', description: 'Caminho de destino' },
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: ['source', 'destination'],
      },
    });
  }

  if (appsCapabilities.open) {
    tools.push({
      name: 'pc.openApplication',
      description: 'Abre um aplicativo autorizado no computador conectado.',
      input_schema: {
        type: 'object' as const,
        properties: {
          app: { type: 'string', description: 'Nome do executável (ex: notepad.exe, calc.exe, msedge.exe)' },
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: ['app'],
      },
    });
  }

  if (browser.openUrl !== false) {
    tools.push({
      name: 'pc.openUrl',
      description: 'Abre uma URL no navegador padrão do computador conectado.',
      input_schema: {
        type: 'object' as const,
        properties: {
          url: { type: 'string', description: 'URL a abrir' },
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: ['url'],
      },
    });
  }

  if (system.info !== false) {
    tools.push({
      name: 'pc.getDeviceInfo',
      description: 'Obtém informações básicas do computador conectado (SO, hostname, etc).',
      input_schema: {
        type: 'object' as const,
        properties: {
          device_id: { type: 'string', description: 'ID do dispositivo', default: deviceId },
        },
        required: [],
      },
    });
  }

  return tools;
}
