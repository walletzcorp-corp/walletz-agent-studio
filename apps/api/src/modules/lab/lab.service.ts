import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { eq, and, isNull, isNotNull, ilike, or } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { agents } from '../../database/schema/agents';
import { knowledgeChunks, knowledgeSources, knowledgeItems } from '../../database/schema/knowledge';
import { createId } from '../../database/utils/id';
import { SchedulingToolsService, type ToolContext } from '../calendars/scheduling-tools.service';
import { PcConnectorService } from '../pc-connector/pc-connector.service';
import type { LabChatDto, ChatMessageDto } from './dto/chat.dto';

export interface LabChatResult {
  traceId: string;
  reply: string;
  inputTokens: number;
  outputTokens: number;
  retrievedChunks: Array<{ content: string; source: string }>;
  toolCallsExecuted?: string[];
}

/* ── Anthropic tool definitions for conversational scheduling ── */
const SCHEDULING_TOOLS: Anthropic.Tool[] = [
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
          description: 'Data/hora de início em ISO 8601 (ex: 2026-10-07T14:00:00-03:00)',
        },
        end_at: {
          type: 'string',
          description: 'Data/hora de término em ISO 8601',
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
        timezone: {
          type: 'string',
          description: 'Fuso horário (ex: America/Sao_Paulo)',
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
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
    private readonly schedulingTools: SchedulingToolsService,
    private readonly pcConnector: PcConnectorService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY') ?? '';
    this.client = new Anthropic({ apiKey });
    this.defaultModel = this.config.get<string>('ANTHROPIC_DEFAULT_MODEL') ?? 'claude-sonnet-4-6';
  }

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
    const schedulingEnabled = agentSettings?.canSchedule === true;

    /* Check for connected PC devices for this tenant */
    const pcDevicesList = await this.pcConnector.listDevices(tenantId);
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

    /* Message history */
    const messages: Anthropic.MessageParam[] = [
      ...(dto.history ?? []).map((m: ChatMessageDto) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: dto.message },
    ];

    const tools: Anthropic.Tool[] = [
      ...(schedulingEnabled ? SCHEDULING_TOOLS : []),
      ...(pcEnabled ? buildPcTools(onlineDevice!.id, onlineDevice!.capabilities as Record<string, unknown>) : []),
    ];
    const toolCtx: ToolContext = {
      tenantId,
      agentId: dto.agentId,
      conversationId: options?.conversationId,
      contactId: options?.contactId,
    };

    const toolCallsExecuted: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      /* Agentic loop — keeps running while model requests tool calls */
      let response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      while (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          this.logger.debug(`Tool call: ${block.name} — ${JSON.stringify(block.input)}`);
          toolCallsExecuted.push(block.name);

          let toolOutput: unknown;
          try {
            if (block.name.startsWith('pc.') && onlineDevice) {
              toolOutput = await this.pcConnector.enqueueCommand(
                tenantId,
                onlineDevice.id,
                block.name,
                block.input as Record<string, unknown>,
                dto.agentId,
              );
            } else {
              toolOutput = await this.schedulingTools.dispatch(
                block.name,
                block.input as Record<string, unknown>,
                toolCtx,
              );
            }
          } catch (err) {
            toolOutput = { error: err instanceof Error ? err.message : String(err) };
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(toolOutput),
          });
        }

        /* Feed tool results back and continue the loop */
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });

        response = await this.client.messages.create({
          model: this.defaultModel,
          max_tokens: 2048,
          system: systemPrompt,
          messages,
          tools: tools.length > 0 ? tools : undefined,
        });

        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;
      }

      const textBlock = response.content.find((b) => b.type === 'text');
      const reply = textBlock?.type === 'text' ? textBlock.text : '';

      return {
        traceId,
        reply,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        retrievedChunks: retrievedChunks.map((c) => ({ content: c.content, source: c.sourceName })),
        toolCallsExecuted: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`LLM call failed: ${msg}`);

      if (msg.includes('authentication') || msg.includes('invalid') || msg.includes('placeholder')) {
        throw new BadRequestException(
          'ANTHROPIC_API_KEY não está configurada. Configure uma chave real no .env.local para usar o laboratório.',
        );
      }
      throw err;
    }
  }

  private async retrieveRelevantChunks(
    query: string,
    tenantId: string,
    agentId: string,
    limit = 5,
  ): Promise<Array<{ content: string; sourceName: string }>> {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5);

    if (words.length === 0) return [];

    const processedSources = await this.db
      .select({ id: knowledgeSources.id, name: knowledgeSources.name })
      .from(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.tenantId, tenantId),
          eq(knowledgeSources.status, 'processed'),
          isNull(knowledgeSources.deletedAt),
          or(eq(knowledgeSources.agentId, agentId), isNull(knowledgeSources.agentId)),
        ),
      );

    if (processedSources.length === 0) return [];

    const sourceMap = new Map(processedSources.map((s) => [s.id, s.name]));
    const sourceIds = processedSources.map((s) => s.id);
    const firstWord = words[0]!;

    const chunks = await this.db
      .select({ content: knowledgeChunks.content, sourceId: knowledgeChunks.sourceId })
      .from(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.tenantId, tenantId),
          ilike(knowledgeChunks.content, `%${firstWord}%`),
        ),
      )
      .limit(limit);

    return chunks
      .filter((c) => sourceIds.includes(c.sourceId))
      .map((c) => ({
        content: c.content.slice(0, 500),
        sourceName: sourceMap.get(c.sourceId) ?? 'Documento',
      }));
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

1. **Detectar intenção**: Reconheça intenção de agendamento mesmo sem uso da palavra "agenda". Exemplos: "quero marcar", "podemos conversar?", "tem horário?", "quero uma demonstração", "pode ser amanhã?".

2. **Coletar informações**: Antes de agendar, certifique-se de ter nome do cliente e assunto. E-mail é necessário para enviar convite. Pergunte naturalmente, não como formulário.

3. **Consultar disponibilidade REAL**: Use a ferramenta \`get_availability\` para obter horários reais. NUNCA invente horários.

4. **Confirmar antes de criar**: Ofereça opções (máx. 4-5) e aguarde o cliente escolher. Só chame \`create_meeting\` após confirmação explícita.

5. **Verificação de double-booking**: O sistema verifica automaticamente se o slot ainda está livre. Se ocupado, ofereça alternativa.

6. **Configurações do agendamento**:
   - Duração padrão: ${schedulingSettings.defaultDurationMinutes} minutos
   - Plataforma padrão: ${schedulingSettings.defaultPlatform}
   - Fuso horário: ${schedulingSettings.timeZone}

7. **Reagendamento**: Use \`find_meetings\` para localizar a reunião, depois \`reschedule_meeting\`.

8. **Cancelamento**: Use \`find_meetings\` para localizar, depois \`cancel_meeting\`.

9. **Transparência**: Se a criação do evento externo falhar, informe o cliente honestamente. Nunca confirme uma reunião que não foi criada.

10. **Formato da resposta**: Após criar a reunião, informe: data/hora, link da videoconferência (se gerado), e que o convite será enviado ao e-mail fornecido.`);
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

// ── PC Tool Definitions (Anthropic API format) ─────────────────────────────

function buildPcTools(deviceId: string, capabilities: Record<string, unknown>): Anthropic.Tool[] {
  const tools: Anthropic.Tool[] = [];
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
