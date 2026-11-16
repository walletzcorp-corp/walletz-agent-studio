import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Embedding generation service.
 *
 * Anthropic does not expose a text-embeddings endpoint (as of 2026).
 * This service provides the infrastructure for embedding generation and
 * integrates with Voyage AI (Anthropic's recommended partner for RAG with Claude)
 * when VOYAGE_API_KEY is configured. Without a key it logs a warning and returns
 * null — callers must handle null embeddings gracefully.
 *
 * To enable: set VOYAGE_API_KEY in .env.local and EMBEDDING_MODEL (default: voyage-3).
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly voyageKey: string | undefined;
  private readonly model: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.voyageKey = this.config.get<string>('embedding.voyageKey');
    this.model = this.config.get<string>('embedding.model') ?? 'voyage-3';
    this.enabled = !!this.voyageKey;

    if (!this.enabled) {
      this.logger.warn(
        'VOYAGE_API_KEY not configured — embedding generation disabled. ' +
          'Knowledge chunks will be stored without vector embeddings. ' +
          'Full-text search still works.',
      );
    } else {
      this.logger.log(`Embedding service active (model: ${this.model})`);
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate an embedding for a text string.
   * Returns null when embeddings are not configured.
   */
  async embed(text: string): Promise<number[] | null> {
    if (!this.enabled || !this.voyageKey) return null;

    try {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.voyageKey}`,
        },
        body: JSON.stringify({ model: this.model, input: [text] }),
      });

      if (!response.ok) {
        this.logger.error(`Voyage API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const json = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return json.data[0]?.embedding ?? null;
    } catch (err) {
      this.logger.error(`Embedding generation failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts. Returns null entries for failures.
   */
  async embedBatch(texts: string[]): Promise<Array<number[] | null>> {
    if (!this.enabled || !this.voyageKey) return texts.map(() => null);

    const BATCH = 96; // Voyage AI limit per request
    const results: Array<number[] | null> = [];

    for (let i = 0; i < texts.length; i += BATCH) {
      const slice = texts.slice(i, i + BATCH);
      try {
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.voyageKey}`,
          },
          body: JSON.stringify({ model: this.model, input: slice }),
        });

        if (!response.ok) {
          this.logger.error(`Voyage batch error: ${response.status}`);
          results.push(...slice.map(() => null));
          continue;
        }

        const json = (await response.json()) as {
          data: Array<{ embedding: number[]; index: number }>;
        };
        const sorted = json.data.sort((a, b) => a.index - b.index);
        results.push(...sorted.map((d) => d.embedding ?? null));
      } catch (err) {
        this.logger.error(`Batch embedding failed: ${err instanceof Error ? err.message : String(err)}`);
        results.push(...slice.map(() => null));
      }
    }

    return results;
  }
}
