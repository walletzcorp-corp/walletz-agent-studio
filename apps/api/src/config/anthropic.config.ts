import { registerAs } from '@nestjs/config';

export const anthropicConfig = registerAs('anthropic', () => ({
  apiKey: process.env['ANTHROPIC_API_KEY'],
  defaultModel: process.env['ANTHROPIC_DEFAULT_MODEL'] ?? 'claude-sonnet-4-6',
  embeddingModel: process.env['ANTHROPIC_EMBEDDING_MODEL'] ?? 'voyage-3',
}));
