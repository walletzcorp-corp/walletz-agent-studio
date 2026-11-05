import Anthropic from '@anthropic-ai/sdk';
import {
  LlmNotConfiguredError,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from './llm-provider';

const PLACEHOLDER = /replace|placeholder|your[_-]?key|changeme|xxxx/i;

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic | null;

  constructor(
    apiKey: string | undefined,
    private readonly model: string,
  ) {
    this.client = apiKey && !PLACEHOLDER.test(apiKey) ? new Anthropic({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    if (!this.client) throw new LlmNotConfiguredError(this.name);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens,
      system: request.system,
      messages: request.messages.map(toAnthropicMessage),
      tools:
        request.tools.length > 0
          ? request.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
            }))
          : undefined,
    });

    const text = response.content.find((b) => b.type === 'text');
    return {
      text: text?.type === 'text' ? text.text : '',
      toolCalls: response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> })),
      stopReason:
        response.stop_reason === 'tool_use'
          ? 'tool_use'
          : response.stop_reason === 'end_turn'
            ? 'end_turn'
            : 'other',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}

function toAnthropicMessage(message: LlmMessage): Anthropic.MessageParam {
  if (message.role === 'user') return { role: 'user', content: message.content };
  if (message.role === 'tool') {
    return {
      role: 'user',
      content: message.results.map((r) => ({
        type: 'tool_result' as const,
        tool_use_id: r.toolCallId,
        content: r.content,
      })),
    };
  }
  const blocks: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> = [];
  if (message.content) blocks.push({ type: 'text', text: message.content });
  for (const call of message.toolCalls ?? []) {
    blocks.push({ type: 'tool_use', id: call.id, name: call.name, input: call.input });
  }
  return { role: 'assistant', content: blocks };
}
