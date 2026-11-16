import Anthropic from '@anthropic-ai/sdk';
import {
  LlmProviderError,
  classifyProviderError,
  redactSecrets,
  type LlmAdapter,
  type LlmSession,
  type LlmSessionInit,
  type LlmTurn,
} from './llm.types';

const ANTHROPIC_API = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';
const TIMEOUT_MS = 60_000;

function toProviderError(err: unknown): LlmProviderError {
  if (err instanceof LlmProviderError) return err;
  if (err instanceof Anthropic.APIError) {
    const message = redactSecrets(err.message ?? 'erro desconhecido');
    return new LlmProviderError(classifyProviderError(err.status, message), 'anthropic', message, err.status);
  }
  const message = redactSecrets(err instanceof Error ? err.message : String(err));
  return new LlmProviderError('unavailable', 'anthropic', message);
}

class AnthropicSession implements LlmSession {
  private readonly client: Anthropic;
  private readonly messages: Anthropic.MessageParam[];
  private readonly tools: Anthropic.Tool[];

  constructor(private readonly init: LlmSessionInit) {
    this.client = new Anthropic({ apiKey: init.apiKey, maxRetries: 1, timeout: TIMEOUT_MS });
    this.messages = init.history.map((m) => ({ role: m.role, content: m.content }));
    this.tools = init.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: { type: 'object' as const, ...t.inputSchema },
    }));
  }

  async send(): Promise<LlmTurn> {
    try {
      const { data, response } = await this.client.messages
        .create({
          model: this.init.model,
          max_tokens: this.init.maxTokens,
          system: this.init.system,
          messages: this.messages,
          tools: this.tools.length > 0 ? this.tools : undefined,
        })
        .withResponse();
      this.init.onResponseHeaders?.(response.headers as unknown as Headers);

      const text = data.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      const toolCalls = data.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map((b) => ({ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> }));

      if (toolCalls.length > 0) {
        this.messages.push({ role: 'assistant', content: data.content });
      }
      return {
        text,
        toolCalls: data.stop_reason === 'tool_use' ? toolCalls : [],
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      };
    } catch (err) {
      throw toProviderError(err);
    }
  }

  addToolResults(results: Array<{ id: string; output: string }>): void {
    this.messages.push({
      role: 'user',
      content: results.map((r) => ({ type: 'tool_result' as const, tool_use_id: r.id, content: r.output })),
    });
  }
}

export class AnthropicAdapter implements LlmAdapter {
  readonly provider = 'anthropic' as const;

  createSession(init: LlmSessionInit): LlmSession {
    return new AnthropicSession(init);
  }

  async listModels(apiKey: string): Promise<string[]> {
    let res: Response;
    try {
      res = await fetch(`${ANTHROPIC_API}/models?limit=100`, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw toProviderError(err);
    }
    const body = (await res.json().catch(() => ({}))) as {
      data?: Array<{ id: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      const message = redactSecrets(body.error?.message ?? res.statusText);
      throw new LlmProviderError(classifyProviderError(res.status, message), 'anthropic', message, res.status);
    }
    return (body.data ?? []).map((m) => m.id);
  }
}
