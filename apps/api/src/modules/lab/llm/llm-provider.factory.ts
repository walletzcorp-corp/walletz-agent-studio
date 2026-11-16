import type { ConfigService } from '@nestjs/config';
import { AnthropicProvider } from './anthropic.provider';
import type { LlmProvider } from './llm-provider';

/** Selects the active provider from LLM_PROVIDER (default: anthropic). */
export function createLlmProvider(config: ConfigService): LlmProvider {
  const name = (config.get<string>('LLM_PROVIDER') ?? 'anthropic').toLowerCase();

  switch (name) {
    case 'anthropic':
      return new AnthropicProvider(
        config.get<string>('ANTHROPIC_API_KEY'),
        config.get<string>('ANTHROPIC_DEFAULT_MODEL') ?? 'claude-sonnet-4-6',
      );
    default:
      throw new Error(`Unsupported LLM_PROVIDER "${name}". Supported providers: anthropic`);
  }
}
