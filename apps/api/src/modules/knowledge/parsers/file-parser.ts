/**
 * Extração de texto, normalização e divisão em trechos (chunks) para indexação.
 * Nenhum arquivo é executado: só bibliotecas de leitura em memória.
 */
import { decodeText, type KnowledgeFormat } from './file-type';

export interface ParsedChunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

const CHARS_PER_TOKEN = 4;
/** ~500 tokens por trecho, com sobreposição para não cortar uma informação ao meio. */
const CHUNK_CHARS = 2000;
const OVERLAP_CHARS = 200;

/** Erro de conteúdo (ex.: PDF escaneado) — mensagem pronta para o usuário. */
export class ExtractionError extends Error {}

/** Normaliza: Unicode NFC, quebras de linha, espaços e caracteres de controle. */
export function normalizeText(raw: string): string {
  return (
    raw
      .normalize('NFC')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t ]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/** Quebra um bloco grande em pedaços por frase, respeitando o tamanho máximo. */
function splitLong(text: string): string[] {
  if (text.length <= CHUNK_CHARS) return [text];
  const sentences = text.split(/(?<=[.!?;:])\s+/);
  const parts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > CHUNK_CHARS) {
      if (current) parts.push(current);
      current = '';
      for (let i = 0; i < sentence.length; i += CHUNK_CHARS - OVERLAP_CHARS) {
        parts.push(sentence.slice(i, i + CHUNK_CHARS));
      }
      continue;
    }
    if (current.length + sentence.length + 1 > CHUNK_CHARS) {
      parts.push(current);
      current = current.slice(-OVERLAP_CHARS) + ' ' + sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** Agrupa parágrafos em trechos de ~2.000 caracteres, sem perder texto. */
export function chunkText(text: string, source: string): ParsedChunk[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const blocks = normalized.split(/\n\n+/).flatMap((p) => splitLong(p.trim())).filter(Boolean);
  const chunks: ParsedChunk[] = [];
  let buffer = '';
  const flush = () => {
    if (!buffer.trim()) return;
    chunks.push({
      content: buffer.trim(),
      chunkIndex: chunks.length,
      tokenCount: Math.ceil(buffer.length / CHARS_PER_TOKEN),
      metadata: { source },
    });
    buffer = '';
  };
  for (const block of blocks) {
    if (buffer && buffer.length + block.length + 2 > CHUNK_CHARS) flush();
    buffer = buffer ? `${buffer}\n\n${block}` : block;
  }
  flush();
  return chunks;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse 2.x: API em classe (PDFParse). A v1 exportava uma função.
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    if (!result.text.replace(/\s+/g, '').length) {
      throw new ExtractionError(
        'O PDF não tem texto selecionável (provavelmente é imagem escaneada). Envie um PDF com texto ou converta com OCR.',
      );
    }
    return result.text;
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new ExtractionError(`Não foi possível ler o PDF (arquivo corrompido ou protegido por senha): ${msg.slice(0, 200)}`);
  } finally {
    await parser.destroy();
  }
}

/** Converte o HTML do mammoth em texto preservando títulos e listas. */
export function htmlToStructuredText(html: string): string {
  return html
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, inner: string) => `\n\n${'#'.repeat(Number(level))} ${inner}\n\n`)
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|ul|ol|table|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  try {
    const result = await mammoth.convertToHtml({ buffer });
    const text = htmlToStructuredText(result.value);
    if (!text.trim()) throw new ExtractionError('O DOCX não contém texto.');
    return text;
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError('Não foi possível ler o DOCX (arquivo corrompido ou em formato não suportado).');
  }
}

/** Extrai o texto do arquivo conforme o formato validado. */
export async function extractText(buffer: Buffer, format: KnowledgeFormat): Promise<string> {
  switch (format) {
    case 'pdf':
      return extractPdf(buffer);
    case 'docx':
      return extractDocx(buffer);
    case 'html':
      return htmlToStructuredText(decodeText(buffer).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ''));
    case 'txt':
    case 'md':
    case 'csv':
      return decodeText(buffer);
  }
}

/** Atalho usado pelo processamento: extrai, normaliza e divide. */
export async function parseKnowledgeFile(buffer: Buffer, format: KnowledgeFormat, source: string): Promise<ParsedChunk[]> {
  const text = await extractText(buffer, format);
  const chunks = chunkText(text, source);
  if (chunks.length === 0) throw new ExtractionError('O arquivo não contém texto aproveitável.');
  return chunks;
}

/** Formato a partir do MIME salvo (documentos antigos, gravados antes da coluna extension). */
export function formatFromLegacyMime(mimeType: string | null, name: string): KnowledgeFormat {
  const m = (mimeType ?? '').toLowerCase();
  if (m.includes('pdf')) return 'pdf';
  if (m.includes('wordprocessingml')) return 'docx';
  if (m.includes('csv')) return 'csv';
  if (m.includes('html')) return 'html';
  if (m.includes('markdown') || name.toLowerCase().endsWith('.md')) return 'md';
  return 'txt';
}
