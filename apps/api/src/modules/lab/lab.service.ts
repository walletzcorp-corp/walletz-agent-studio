import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { eq, and, isNull, isNotNull, ilike, or } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { agents } from '../../database/schema/agents';
import { knowledgeChunks, knowledgeSources, knowledgeItems } from '../../database/schema/knowledge';
import { createId } from '../../database/utils/id';
import type { LabChatDto, ChatMessageDto } from './dto/chat.dto';

export interface LabChatResult {
  traceId: string;
  reply: string;
  inputTokens: number;
  outputTokens: number;
  retrievedChunks: Array<{ content: string; source: string }>;
}

@Injectable()
export class LabService {
  private readonly logger = new Logger(LabService.name);
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY') ?? '';
    this.client = new Anthropic({ apiKey });
    this.defaultModel = this.config.get<string>('ANTHROPIC_DEFAULT_MODEL') ?? 'claude-sonnet-4-6';
  }

  async chat(dto: LabChatDto, tenantId: string): Promise<LabChatResult> {
    const traceId = createId();

    // Load agent
    const [agent] = await this.db
      .select()
      .from(agents)
      .where(and(eq(agents.id, dto.agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);

    if (!agent) throw new NotFoundException('Agent not found');

    // Retrieve relevant knowledge chunks (keyword-based for dev; pgvector in prod)
    const retrievedChunks = await this.retrieveRelevantChunks(dto.message, tenantId, dto.agentId);

    // Load approved knowledge items (Teach AI)
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

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(agent, approvedItems, retrievedChunks);

    // Build message history
    const messages: Anthropic.MessageParam[] = [
      ...(dto.history ?? []).map((m: ChatMessageDto) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: dto.message },
    ];

    try {
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      const reply = textBlock?.type === 'text' ? textBlock.text : '';

      return {
        traceId,
        reply,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        retrievedChunks: retrievedChunks.map((c) => ({ content: c.content, source: c.sourceName })),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`LLM call failed: ${msg}`);

      // Return graceful fallback if API key not configured
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

    // Keyword search across chunks from processed sources
    const processedSources = await this.db
      .select({ id: knowledgeSources.id, name: knowledgeSources.name })
      .from(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.tenantId, tenantId),
          eq(knowledgeSources.status, 'processed'),
          isNull(knowledgeSources.deletedAt),
          or(
            eq(knowledgeSources.agentId, agentId),
            isNull(knowledgeSources.agentId),
          ),
        ),
      );

    if (processedSources.length === 0) return [];

    const sourceMap = new Map(processedSources.map((s) => [s.id, s.name]));
    const sourceIds = processedSources.map((s) => s.id);

    // Simple keyword match on first word for now (pgvector in prod)
    const firstWord = words[0]!;
    const chunks = await this.db
      .select({
        content: knowledgeChunks.content,
        sourceId: knowledgeChunks.sourceId,
      })
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
  ): string {
    const persona = typeof agent.persona === 'object' && agent.persona !== null
      ? (agent.persona as { name?: string; description?: string })
      : {};

    const parts: string[] = [
      `Você é ${persona.name ?? agent.name}, um assistente de IA.`,
    ];

    if (agent.objective) {
      parts.push(`\nSeu objetivo: ${agent.objective}`);
    }

    if (agent.tone) {
      parts.push(`\nTom de comunicação: ${agent.tone}`);
    }

    if (agent.language) {
      parts.push(`\nIdioma principal: ${agent.language}`);
    }

    if (knowledgeItemsList.length > 0) {
      parts.push('\n\n## Conhecimento e Regras\n');
      const facts = knowledgeItemsList.filter((i) => i.type === 'fact');
      const guidance = knowledgeItemsList.filter((i) => i.type === 'guidance');
      const procedures = knowledgeItemsList.filter((i) => i.type === 'procedure');
      const permissions = knowledgeItemsList.filter((i) => i.type === 'permission');

      if (facts.length > 0) {
        parts.push('### Fatos\n' + facts.map((i) => `- ${i.content}${i.context ? ` (${i.context})` : ''}`).join('\n'));
      }
      if (guidance.length > 0) {
        parts.push('### Diretrizes\n' + guidance.map((i) => `- ${i.content}`).join('\n'));
      }
      if (procedures.length > 0) {
        parts.push('### Procedimentos\n' + procedures.map((i) => `- ${i.content}`).join('\n'));
      }
      if (permissions.length > 0) {
        parts.push('### Permissões\n' + permissions.map((i) => `- ${i.content}`).join('\n'));
      }
    }

    if (chunks.length > 0) {
      parts.push('\n\n## Base de Conhecimento Relevante\n');
      chunks.forEach((c, i) => {
        parts.push(`### Trecho ${i + 1} (${c.sourceName})\n${c.content}`);
      });
    }

    parts.push('\n\nSempre responda no idioma do usuário. Seja claro, objetivo e útil.');

    return parts.join('\n');
  }
}
