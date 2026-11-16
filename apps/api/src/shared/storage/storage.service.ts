import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageUploadParams {
  key: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface StorageFile {
  key: string;
  size: number;
}

/** Interface do armazenamento de arquivos. Nesta fase só existe o provedor local. */
export interface StorageProvider {
  upload(params: StorageUploadParams): Promise<StorageFile>;
  readBuffer(key: string): Promise<Buffer | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

/** Caminho lógico de um arquivo da base de conhecimento (só IDs internos, nunca o nome enviado). */
export function knowledgeStorageKey(tenantId: string, sourceId: string, extension: string): string {
  const safe = (v: string) => {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(v)) throw new BadRequestException('Identificador inválido para o storage');
    return v;
  };
  if (!/^[a-z0-9]{1,8}$/.test(extension)) throw new BadRequestException('Extensão inválida para o storage');
  return `tenants/${safe(tenantId)}/knowledge/${safe(sourceId)}/original.${extension}`;
}

/** Chaves aceitas: o formato novo e o legado (`<tenantId>/<id>.<ext>`, gravado achatado). */
const KEY_PATTERN = /^tenants\/[A-Za-z0-9_-]{1,64}\/knowledge\/[A-Za-z0-9_-]{1,64}\/original\.[a-z0-9]{1,8}$/;
const LEGACY_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9]{1,8}$/;
const LEGACY_DIR = 'walletz-knowledge';

/**
 * Armazenamento local persistente (STORAGE_PROVIDER=local).
 *
 * Raiz: STORAGE_LOCAL_ROOT. Sem a variável, usa `<cwd>/uploads` — em produção é
 * /app/uploads, montado no volume Docker `prod_agent_studio_uploads` (sobrevive a
 * restart e deploy). Arquivos são dados: gravados sem permissão de execução e
 * nunca passados a shell.
 */
@Injectable()
export class StorageService implements StorageProvider {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;
  private realRoot: string;

  constructor(configService: ConfigService) {
    const provider = configService.get<string>('STORAGE_PROVIDER') ?? 'local';
    if (provider !== 'local') {
      throw new Error(`STORAGE_PROVIDER="${provider}" não suportado: nesta versão só existe o armazenamento local.`);
    }
    const configured = configService.get<string>('STORAGE_LOCAL_ROOT');
    this.root = path.resolve(configured && configured.trim() ? configured.trim() : path.join(process.cwd(), 'uploads'));
    fs.mkdirSync(this.root, { recursive: true, mode: 0o750 });
    this.realRoot = fs.realpathSync(this.root);
    this.logger.log(`Storage local em ${this.realRoot}`);
  }

  get rootPath(): string {
    return this.realRoot;
  }

  /**
   * Converte a chave em caminho absoluto dentro da raiz. Recusa `..`, caminho absoluto,
   * UNC, bytes nulos e qualquer chave fora dos formatos conhecidos.
   */
  resolveKey(key: string): string {
    if (typeof key !== 'string' || key.length === 0 || key.length > 300) throw new BadRequestException('Chave de storage inválida');
    if (key.includes('\0') || key.includes('..') || key.includes('\\') || path.isAbsolute(key) || key.startsWith('/')) {
      throw new BadRequestException('Chave de storage inválida');
    }
    let relative: string;
    if (KEY_PATTERN.test(key)) relative = key;
    else if (LEGACY_KEY_PATTERN.test(key)) relative = path.posix.join(LEGACY_DIR, key.replace(/\//g, '_'));
    else throw new BadRequestException('Chave de storage inválida');

    const abs = path.resolve(this.realRoot, relative);
    if (!abs.startsWith(this.realRoot + path.sep)) throw new BadRequestException('Chave de storage inválida');
    return abs;
  }

  /** Garante que nenhum componente do caminho existente é symlink apontando para fora da raiz. */
  private assertNoEscape(abs: string): void {
    let current = path.dirname(abs);
    const existing: string[] = [];
    while (current.startsWith(this.realRoot) && current !== this.realRoot) {
      existing.push(current);
      current = path.dirname(current);
    }
    for (const p of [...existing, abs]) {
      if (!fs.existsSync(p)) continue;
      const stat = fs.lstatSync(p);
      if (stat.isSymbolicLink()) throw new BadRequestException('Caminho de storage inválido');
      const real = fs.realpathSync(p);
      if (real !== this.realRoot && !real.startsWith(this.realRoot + path.sep)) {
        throw new BadRequestException('Caminho de storage inválido');
      }
    }
  }

  async upload(params: StorageUploadParams): Promise<StorageFile> {
    const abs = this.resolveKey(params.key);
    fs.mkdirSync(path.dirname(abs), { recursive: true, mode: 0o750 });
    this.assertNoEscape(abs);
    // Escrita atômica: arquivo temporário no mesmo diretório + rename. Sem bit de execução.
    const tmp = `${abs}.${process.pid}.${Date.now()}.part`;
    await fs.promises.writeFile(tmp, params.buffer, { mode: 0o640, flag: 'wx' });
    await fs.promises.rename(tmp, abs);
    return { key: params.key, size: params.buffer.length };
  }

  async readBuffer(key: string): Promise<Buffer | null> {
    const abs = this.resolveKey(key);
    if (!fs.existsSync(abs)) return null;
    this.assertNoEscape(abs);
    return fs.promises.readFile(abs);
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    const abs = this.resolveKey(key);
    if (!fs.existsSync(abs)) return;
    this.assertNoEscape(abs);
    await fs.promises.unlink(abs);
    this.pruneEmptyDirs(path.dirname(abs));
  }

  /** Remove diretórios vazios até a raiz (ex.: knowledge/{id}/ após excluir o documento). */
  private pruneEmptyDirs(dir: string): void {
    let current = dir;
    while (current.startsWith(this.realRoot + path.sep)) {
      try {
        if (fs.readdirSync(current).length > 0) return;
        fs.rmdirSync(current);
      } catch {
        return;
      }
      current = path.dirname(current);
    }
  }
}
