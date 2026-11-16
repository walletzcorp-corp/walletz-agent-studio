import { BadRequestException } from '@nestjs/common';

/**
 * Formatos aceitos na base de conhecimento. Só entra aqui o que é extraído de verdade
 * (DOC antigo, XLSX e imagens não são suportados e não aparecem na interface).
 */
export const KNOWLEDGE_FORMATS = {
  pdf: { mimeType: 'application/pdf', label: 'PDF' },
  docx: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX' },
  txt: { mimeType: 'text/plain; charset=utf-8', label: 'TXT' },
  md: { mimeType: 'text/markdown; charset=utf-8', label: 'MD' },
  csv: { mimeType: 'text/csv; charset=utf-8', label: 'CSV' },
  html: { mimeType: 'text/html; charset=utf-8', label: 'HTML' },
} as const;

export type KnowledgeFormat = keyof typeof KNOWLEDGE_FORMATS;

const EXTENSION_ALIASES: Record<string, KnowledgeFormat> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
  text: 'txt',
  md: 'md',
  markdown: 'md',
  csv: 'csv',
  html: 'html',
  htm: 'html',
};

const TEXT_FORMATS = new Set<KnowledgeFormat>(['txt', 'md', 'csv', 'html']);

/** Assinaturas de executáveis e binários que nunca podem entrar como texto. */
function looksExecutableOrBinary(buffer: Buffer): string | null {
  const head = buffer.subarray(0, 8);
  if (head[0] === 0x4d && head[1] === 0x5a) return 'executável Windows';
  if (head[0] === 0x7f && head[1] === 0x45 && head[2] === 0x4c && head[3] === 0x46) return 'executável Linux';
  if (head[0] === 0xcf && head[1] === 0xfa && head[2] === 0xed && head[3] === 0xfe) return 'executável macOS';
  if (head[0] === 0x50 && head[1] === 0x4b) return 'arquivo compactado';
  if (head.subarray(0, 5).toString('latin1') === '%PDF-') return 'PDF';
  return null;
}

function hasNullBytes(buffer: Buffer): boolean {
  return buffer.subarray(0, 64 * 1024).includes(0);
}

/** Nome original para exibição: sem caminho, sem caracteres de controle, até 255 caracteres. */
export function sanitizeFilename(raw: string | undefined, fallback = 'arquivo'): string {
  const base = String(raw ?? '')
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const name = base === '' || base === '.' || base === '..' ? fallback : base;
  if (name.length <= 255) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : '';
  return name.slice(0, 255 - ext.length) + ext;
}

/**
 * Determina o formato pela extensão e confere com o conteúdo real (assinatura).
 * MIME informado pelo navegador é ignorado: não é confiável.
 */
export function detectKnowledgeFormat(originalName: string, buffer: Buffer): { format: KnowledgeFormat; mimeType: string } {
  if (!buffer || buffer.length === 0) throw new BadRequestException('O arquivo está vazio.');

  const ext = (originalName.split('.').pop() ?? '').toLowerCase();
  const format = originalName.includes('.') ? EXTENSION_ALIASES[ext] : undefined;
  if (!format) {
    throw new BadRequestException('Formato não suportado. Envie PDF, DOCX, TXT, MD, CSV ou HTML.');
  }

  if (format === 'pdf') {
    // A especificação admite bytes antes do cabeçalho, dentro do primeiro 1 KB.
    if (buffer.subarray(0, 1024).indexOf('%PDF-') === -1) {
      throw new BadRequestException('O conteúdo do arquivo não é um PDF válido.');
    }
  } else if (format === 'docx') {
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip || buffer.indexOf('word/document.xml') === -1) {
      throw new BadRequestException('O conteúdo do arquivo não é um DOCX válido (arquivos .doc antigos não são suportados).');
    }
  } else if (TEXT_FORMATS.has(format)) {
    const binary = looksExecutableOrBinary(buffer);
    if (binary) throw new BadRequestException(`O arquivo .${ext} contém ${binary}, não texto.`);
    if (hasNullBytes(buffer)) throw new BadRequestException(`O arquivo .${ext} não é texto (contém dados binários).`);
  }

  return { format, mimeType: KNOWLEDGE_FORMATS[format].mimeType };
}

/** Decodifica texto: UTF-8 (com ou sem BOM); se inválido, Windows-1252/Latin-1. */
export function decodeText(buffer: Buffer): string {
  let bytes = buffer;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bytes = bytes.subarray(3);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}
