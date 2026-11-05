'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../hooks/use-auth';
import { knowledgeApi, type KnowledgeSource } from '../../../lib/knowledge-api';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '@walletz/ui';
import {
  Upload,
  FileText,
  Globe,
  Type,
  RefreshCw,
  Trash2,
  Plus,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  KnowledgeSource['status'],
  {
    label: string;
    icon: React.ReactNode;
    variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
  }
> = {
  pending: { label: 'Pendente', icon: <Clock className="h-3 w-3" />, variant: 'secondary' },
  processing: {
    label: 'Processando',
    icon: <RefreshCw className="h-3 w-3 animate-spin" />,
    variant: 'warning',
  },
  processed: { label: 'Pronto', icon: <CheckCircle2 className="h-3 w-3" />, variant: 'success' },
  failed: { label: 'Falhou', icon: <AlertCircle className="h-3 w-3" />, variant: 'destructive' },
  outdated: { label: 'Desatualizado', icon: <Clock className="h-3 w-3" />, variant: 'outline' },
};

const TYPE_ICONS: Record<KnowledgeSource['type'], React.ReactNode> = {
  pdf: <FileText className="h-4 w-4 text-red-500" />,
  docx: <FileText className="h-4 w-4 text-blue-500" />,
  xlsx: <FileText className="h-4 w-4 text-green-500" />,
  csv: <FileText className="h-4 w-4 text-green-400" />,
  txt: <FileText className="h-4 w-4 text-muted-foreground" />,
  html: <Globe className="h-4 w-4 text-orange-500" />,
  url: <Globe className="h-4 w-4 text-blue-400" />,
  faq: <BookOpen className="h-4 w-4 text-purple-500" />,
  typed: <Type className="h-4 w-4 text-indigo-500" />,
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadMode = 'file' | 'typed' | null;

export default function KnowledgePage() {
  const { tenantId } = useAuth();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<UploadMode>(null);
  const [uploading, setUploading] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [typedContent, setTypedContent] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!tenantId) return;
    try {
      const { data } = await knowledgeApi.list(tenantId);
      setSources(data);
    } catch {
      setError('Erro ao carregar base de conhecimento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tenantId]);

  // Poll for processing sources every 5s
  useEffect(() => {
    const hasProcessing = sources.some((s) => s.status === 'pending' || s.status === 'processing');
    if (!hasProcessing) return;
    const timer = setTimeout(load, 5000);
    return () => clearTimeout(timer);
  }, [sources]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    setUploading(true);
    setError(null);
    try {
      await knowledgeApi.upload(tenantId, file);
      setMode(null);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Erro no upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleTypedSubmit = async () => {
    if (!tenantId || !typedName.trim() || !typedContent.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await knowledgeApi.createTyped(tenantId, { name: typedName, content: typedContent });
      setMode(null);
      setTypedName('');
      setTypedContent('');
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Erro ao salvar conteúdo');
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (sourceId: string) => {
    if (!tenantId) return;
    try {
      await knowledgeApi.retry(tenantId, sourceId);
      await load();
    } catch {
      /* silent */
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!tenantId || !confirm('Remover esta fonte de conhecimento?')) return;
    try {
      await knowledgeApi.remove(tenantId, sourceId);
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch {
      /* silent */
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Documentos e conteúdos que seus agentes consultarão
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setMode('typed');
              setError(null);
            }}
          >
            <Type className="h-4 w-4" />
            Digitar conteúdo
          </Button>
          <Button
            onClick={() => {
              setMode('file');
              setError(null);
              fileRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" />
            Upload de arquivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.csv,.html"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {/* Typed content form */}
      {mode === 'typed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo conteúdo digitado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Título / assunto"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
            />
            <textarea
              className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder="Digite o conteúdo que o agente deve aprender…"
              value={typedContent}
              onChange={(e) => setTypedContent(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMode(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleTypedSubmit}
                disabled={uploading || !typedName.trim() || !typedContent.trim()}
              >
                {uploading ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload indicator */}
      {mode === 'file' && uploading && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Enviando arquivo…</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : sources.length === 0 && mode === null ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Nenhum documento ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione PDFs, documentos Word, arquivos de texto ou escreva conteúdo diretamente
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode('typed')}>
                <Type className="h-4 w-4" />
                Digitar conteúdo
              </Button>
              <Button
                onClick={() => {
                  setMode('file');
                  fileRef.current?.click();
                }}
              >
                <Plus className="h-4 w-4" />
                Adicionar arquivo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => {
            const statusCfg = STATUS_CONFIG[source.status];
            return (
              <Card key={source.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  <div className="shrink-0">{TYPE_ICONS[source.type]}</div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{source.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground uppercase">{source.type}</span>
                      {source.fileSizeBytes != null && (
                        <span className="text-xs text-muted-foreground">
                          · {formatBytes(source.fileSizeBytes)}
                        </span>
                      )}
                      {source.processedAt && (
                        <span className="text-xs text-muted-foreground">
                          · Processado {new Date(source.processedAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    {source.processingError && (
                      <p className="text-xs text-destructive mt-1 truncate">
                        {source.processingError}
                      </p>
                    )}
                  </div>

                  <Badge variant={statusCfg.variant} className="shrink-0 flex items-center gap-1">
                    {statusCfg.icon}
                    {statusCfg.label}
                  </Badge>

                  <div className="flex items-center gap-1 shrink-0">
                    {source.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reprocessar"
                        onClick={() => handleRetry(source.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(source.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
