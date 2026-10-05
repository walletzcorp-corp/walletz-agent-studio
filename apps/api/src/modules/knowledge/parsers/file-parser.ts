/**
 * Extracts plain text from various file types.
 * Chunked into ~500-token segments for embedding.
 */

export interface ParsedChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

const CHUNK_SIZE = 500; // approximate tokens (~2000 chars)
const CHARS_PER_TOKEN = 4;

function splitIntoChunks(text: string, source: string): ParsedChunk[] {
  const maxChars = CHUNK_SIZE * CHARS_PER_TOKEN;
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: ParsedChunk[] = [];
  let buffer = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (buffer.length + para.length > maxChars && buffer.length > 0) {
      chunks.push({
        content: buffer.trim(),
        chunkIndex,
        tokenCount: Math.ceil(buffer.length / CHARS_PER_TOKEN),
        metadata: { source },
      });
      chunkIndex++;
      buffer = '';
    }
    buffer += (buffer.length > 0 ? '\n\n' : '') + para;
  }

  if (buffer.trim().length > 0) {
    chunks.push({
      content: buffer.trim(),
      chunkIndex,
      tokenCount: Math.ceil(buffer.length / CHARS_PER_TOKEN),
      metadata: { source },
    });
  }

  return chunks.length > 0 ? chunks : [{ content: text.trim(), chunkIndex: 0, tokenCount: Math.ceil(text.length / CHARS_PER_TOKEN), metadata: { source } }];
}

export async function parsePdf(buffer: Buffer, filename: string): Promise<ParsedChunk[]> {
  const mod = await import('pdf-parse');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (mod.default ?? mod) as unknown as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return splitIntoChunks(data.text, filename);
}

export async function parseDocx(buffer: Buffer, filename: string): Promise<ParsedChunk[]> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return splitIntoChunks(result.value, filename);
}

export async function parseCsv(buffer: Buffer, filename: string): Promise<ParsedChunk[]> {
  const text = buffer.toString('utf-8');
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  // Convert CSV rows to prose lines for indexing
  const prose = lines.join('\n');
  return splitIntoChunks(prose, filename);
}

export async function parseTxt(buffer: Buffer, filename: string): Promise<ParsedChunk[]> {
  const text = buffer.toString('utf-8');
  return splitIntoChunks(text, filename);
}

export async function parseByMimeType(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ParsedChunk[]> {
  if (mimeType === 'application/pdf') return parsePdf(buffer, filename);
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return parseDocx(buffer, filename);
  if (mimeType === 'text/csv' || mimeType === 'application/csv') return parseCsv(buffer, filename);
  if (mimeType.startsWith('text/')) return parseTxt(buffer, filename);
  // Fallback: attempt plain text
  return parseTxt(buffer, filename);
}
