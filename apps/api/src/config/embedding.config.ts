import { registerAs } from '@nestjs/config';

export const embeddingConfig = registerAs('embedding', () => ({
  // Voyage AI (Anthropic's recommended embedding partner for RAG with Claude)
  // Set VOYAGE_API_KEY to enable vector embeddings. Without it, chunks are
  // stored as plain text and full-text search is used instead.
  voyageKey: process.env['VOYAGE_API_KEY'],
  model: process.env['EMBEDDING_MODEL'] ?? 'voyage-3',
}));
