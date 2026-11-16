/**
 * Provider-neutral LLM contract. The agent runtime talks only to this interface, so adding
 * another provider means writing one adapter, and tests can inject a scripted provider.
 */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface LlmToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LlmToolResult {
  toolCallId: string;
  content: string;
}

export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; results: LlmToolResult[] };

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  tools: LlmToolDefinition[];
  maxTokens: number;
}

export interface LlmResponse {
  text: string;
  toolCalls: LlmToolCall[];
  stopReason: 'end_turn' | 'tool_use' | 'other';
  usage: { inputTokens: number; outputTokens: number };
}

export interface LlmProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(request: LlmRequest): Promise<LlmResponse>;
}

export class LlmNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`LLM provider "${provider}" is not configured with a valid credential`);
    this.name = 'LlmNotConfiguredError';
  }
}
