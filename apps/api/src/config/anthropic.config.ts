import { registerAs } from '@nestjs/config';

/**
 * Não há chave de IA da plataforma: cada cliente conecta a própria chave (BYOK,
 * tabela ai_provider_connections). Aqui fica só o modelo de embeddings legado.
 */
export const anthropicConfig = registerAs('anthropic', () => ({
  embeddingModel: process.env['ANTHROPIC_EMBEDDING_MODEL'] ?? 'voyage-3',
}));
