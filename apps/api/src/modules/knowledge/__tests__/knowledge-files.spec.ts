import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { decodeText, detectKnowledgeFormat, sanitizeFilename } from '../parsers/file-type';
import { chunkText, htmlToStructuredText, normalizeText } from '../parsers/file-parser';
import { StorageService, knowledgeStorageKey } from '../../../shared/storage/storage.service';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n', 'latin1');
const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200, 1)]);
const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(100, 2)]);
const fakeDocx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('....word/document.xml....')]);

describe('validação de arquivo (pelo conteúdo, não pelo MIME do navegador)', () => {
  it('aceita PDF, DOCX, TXT e MD verdadeiros', () => {
    expect(detectKnowledgeFormat('Rota de Vendas.pdf', pdf).format).toBe('pdf');
    expect(detectKnowledgeFormat('manual.docx', fakeDocx).format).toBe('docx');
    expect(detectKnowledgeFormat('notas.txt', Buffer.from('olá mundo')).format).toBe('txt');
    expect(detectKnowledgeFormat('LEIAME.MD', Buffer.from('# Título\n\n- item')).format).toBe('md');
  });

  it('recusa arquivo vazio', () => {
    expect(() => detectKnowledgeFormat('a.pdf', Buffer.alloc(0))).toThrow(/vazio/);
  });

  it.each([
    ['executável renomeado para .pdf', 'nota.pdf', exe, /não é um PDF/],
    ['executável renomeado para .txt', 'leia.txt', exe, /executável Windows/],
    ['ELF renomeado para .md', 'x.md', elf, /executável Linux/],
    ['PDF disfarçado de .txt', 'x.txt', pdf, /contém PDF/],
    ['ZIP qualquer como .docx', 'x.docx', Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(50)]), /não é um DOCX/],
    ['binário com bytes nulos como .csv', 'x.csv', Buffer.from([0x41, 0x00, 0x42]), /binários/],
    ['.doc antigo', 'antigo.doc', Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), /não suportado/],
    ['sem extensão', 'arquivo', Buffer.from('texto'), /não suportado/],
    ['.exe', 'virus.exe', exe, /não suportado/],
  ])('recusa %s', (_label, name, buffer, message) => {
    expect(() => detectKnowledgeFormat(name, buffer)).toThrow(message);
  });

  it('nome com caminho, controle e tamanho gigante vira nome seguro', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('C:\\Windows\\system32\\a.pdf')).toBe('a.pdf');
    expect(sanitizeFilename('rel\u0000at\u0007ório.pdf')).toBe('relatório.pdf');
    expect(sanitizeFilename('..')).toBe('arquivo');
    const giant = sanitizeFilename(`${'a'.repeat(5000)}.pdf`);
    expect(giant.length).toBe(255);
    expect(giant.endsWith('.pdf')).toBe(true);
  });

  it('decodifica UTF-8 (com BOM) e cai para Windows-1252 quando não é UTF-8', () => {
    expect(decodeText(Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from('ação')]))).toBe('ação');
    expect(decodeText(Buffer.from([0x61, 0xe7, 0xe3, 0x6f]))).toBe('ação');
  });
});

describe('extração e chunking', () => {
  it('normaliza sem perder texto', () => {
    expect(normalizeText('a\r\n\r\n\r\n\r\nb\t\tc\u0000')).toBe('a\n\nb c');
  });

  it('texto longo é dividido sem perder conteúdo e sem trechos gigantes', () => {
    const paragraph = Array.from({ length: 400 }, (_, i) => `Frase número ${i} sobre o produto.`).join(' ');
    const chunks = chunkText(`${paragraph}\n\nCódigo único: ZEBRA-42.`, 'doc.txt');
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(2200);
    const all = chunks.map((c) => c.content).join(' ');
    expect(all).toContain('Frase número 0 ');
    expect(all).toContain('Frase número 399 ');
    expect(all).toContain('ZEBRA-42');
  });

  it('DOCX: preserva títulos e listas', () => {
    const text = htmlToStructuredText('<h1>Política</h1><p>Texto &amp; mais</p><ul><li>Um</li><li>Dois</li></ul>');
    expect(text).toContain('# Política');
    expect(text).toContain('- Um');
    expect(text).toContain('Texto & mais');
  });
});

describe('storage local', () => {
  let root: string;
  let storage: StorageService;
  const config = (vars: Record<string, string>) => ({ get: (k: string) => vars[k] }) as unknown as ConfigService;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'walletz-storage-'));
    storage = new StorageService(config({ STORAGE_LOCAL_ROOT: root }));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('grava em tenants/{tenantId}/knowledge/{id}/original.ext, lê e exclui', async () => {
    const key = knowledgeStorageKey('tenant-a', 'doc-1', 'pdf');
    expect(key).toBe('tenants/tenant-a/knowledge/doc-1/original.pdf');
    await storage.upload({ key, buffer: pdf, mimeType: 'application/pdf', originalName: 'x.pdf' });
    const abs = path.join(root, key);
    expect(fs.existsSync(abs)).toBe(true);
    if (process.platform !== 'win32') expect(fs.statSync(abs).mode & 0o111).toBe(0); // nunca executável
    expect((await storage.readBuffer(key))?.equals(pdf)).toBe(true);
    await storage.delete(key);
    expect(fs.existsSync(abs)).toBe(false);
    expect(fs.existsSync(path.join(root, 'tenants/tenant-a/knowledge/doc-1'))).toBe(false); // sem pasta órfã
  });

  it('lê arquivos gravados no formato antigo', async () => {
    fs.mkdirSync(path.join(root, 'walletz-knowledge'), { recursive: true });
    fs.writeFileSync(path.join(root, 'walletz-knowledge', 'tenant-a_abc.pdf'), pdf);
    expect((await storage.readBuffer('tenant-a/abc.pdf'))?.equals(pdf)).toBe(true);
  });

  it.each([
    '../fora.pdf',
    'tenants/../../etc/passwd',
    '/etc/passwd',
    'C:\\Windows\\win.ini',
    '\\\\servidor\\share\\x.pdf',
    'tenants/a/knowledge/b/original.pdf\u0000.txt',
    'tenants/a/knowledge/b/../../x/original.pdf',
    'qualquer/coisa/fora/do/padrao',
  ])('recusa chave maliciosa: %s', (key) => {
    expect(() => storage.resolveKey(key)).toThrow(BadRequestException);
  });

  it('recusa IDs inválidos ao montar a chave', () => {
    expect(() => knowledgeStorageKey('../t', 'x', 'pdf')).toThrow(BadRequestException);
    expect(() => knowledgeStorageKey('t', 'x', 'p/df')).toThrow(BadRequestException);
  });

  it('não segue symlink que escapa da raiz', async () => {
    if (process.platform === 'win32') return; // symlink exige privilégio no Windows
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'walletz-outside-'));
    fs.mkdirSync(path.join(root, 'tenants', 'tenant-a', 'knowledge'), { recursive: true });
    fs.symlinkSync(outside, path.join(root, 'tenants', 'tenant-a', 'knowledge', 'doc-x'));
    await expect(
      storage.upload({ key: knowledgeStorageKey('tenant-a', 'doc-x', 'txt'), buffer: Buffer.from('x'), mimeType: 'text/plain', originalName: 'x' }),
    ).rejects.toThrow(BadRequestException);
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it('só aceita o provedor local', () => {
    expect(() => new StorageService(config({ STORAGE_PROVIDER: 's3', STORAGE_LOCAL_ROOT: root }))).toThrow(/não suportado/);
  });
});
