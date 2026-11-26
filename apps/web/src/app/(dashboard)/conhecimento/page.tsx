'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Upload, Type, RefreshCw, Trash2, BookOpen, AlertCircle, CheckCircle2, Loader2, Download, Eye, X, Clock, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';
import { agentsApi, type Agent } from '../../../lib/agents-api';
import {
  knowledgeApi, type KnowledgeFormats, type KnowledgeSource, type KnowledgeSourceDetails, type KnowledgeSourceStatus,
} from '../../../lib/knowledge-api';
import { apiErrorMessage } from '../../../lib/studio-api';
import { useConfirm } from '../../../components/confirm-dialog';

const SHARED = '__shared__';
const input = 'w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50';

const STATUS: Record<KnowledgeSourceStatus, { label: string; className: string; spin?: boolean }> = {
  uploaded: { label: 'Na fila', className: 'bg-surface-2 text-muted-foreground border border-border', spin: true },
  processing: { label: 'Processando', className: 'badge-warning', spin: true },
  indexing: { label: 'Indexando', className: 'badge-warning', spin: true },
  ready: { label: 'Pronto ✓', className: 'badge-success' },
  failed: { label: 'Falha no processamento', className: 'badge-danger' },
  outdated: { label: 'Desatualizado', className: 'bg-surface-2 text-muted-foreground border border-border' },
};

function fmtSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

function typeLabel(s: KnowledgeSource): string {
  if (s.type === 'typed') return 'Texto';
  return (s.extension ?? s.type).toUpperCase();
}

interface UploadItem { id: string; name: string; percent: number; error?: string; done?: boolean }

/** Detalhes do documento (modal). */
function DetailsPanel({
  tenantId, sourceId, agents, onClose, onChanged,
}: {
  tenantId: string;
  sourceId: string;
  agents: Agent[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [d, setD] = useState<KnowledgeSourceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    knowledgeApi.get(tenantId, sourceId).then((r) => setD(r.data)).catch((err) => setError(apiErrorMessage(err)));
  }, [tenantId, sourceId]);
  useEffect(load, [load]);

  const changeAgent = async (value: string) => {
    setBusy(true);
    try {
      await knowledgeApi.setAgent(tenantId, sourceId, value === SHARED ? null : value);
      load();
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="neural-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground break-all">{d?.name ?? 'Documento'}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {error && <p className="text-sm text-neural-danger">{error}</p>}
        {!d ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Situação</dt><dd>{STATUS[d.status].label}</dd>
              <dt className="text-muted-foreground">Tipo / tamanho</dt><dd>{typeLabel(d)} · {fmtSize(d.fileSizeBytes)}</dd>
              <dt className="text-muted-foreground">Trechos de texto</dt><dd>{d.chunks} ({d.extractedCharacters.toLocaleString('pt-BR')} caracteres)</dd>
              <dt className="text-muted-foreground">Busca semântica</dt>
              <dd>
                {d.indexStatus === 'indexed' ? `Indexado (${d.embeddedChunks} vetores)` : d.indexStatus === 'awaiting_ai' ? 'Aguardando configuração de IA' : d.indexStatus === 'failed' ? 'Falhou' : 'Pendente'}
              </dd>
              <dt className="text-muted-foreground">Enviado em</dt><dd>{new Date(d.createdAt).toLocaleString('pt-BR')}</dd>
              {d.processedAt && (<><dt className="text-muted-foreground">Processado em</dt><dd>{new Date(d.processedAt).toLocaleString('pt-BR')}</dd></>)}
            </dl>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Usado por</label>
              <select className={input} disabled={busy} value={d.agentId ?? SHARED} onChange={(e) => void changeAgent(e.target.value)}>
                <option value={SHARED}>Compartilhado com todos os agentes</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {d.processingError && (
              <div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-3 text-sm text-foreground">
                <p className="font-medium text-neural-danger">Falha no processamento</p>
                <p className="mt-1 text-muted-foreground">{d.processingError}</p>
              </div>
            )}
            {d.indexError && d.indexStatus !== 'indexed' && (
              <div className="rounded-lg border border-neural-warning/40 bg-neural-warning/5 p-3 text-xs text-muted-foreground">
                {d.indexError} {d.indexStatus === 'awaiting_ai' && <Link href="/configuracoes/ia" className="text-neural-blue hover:underline">Config. IA</Link>}
              </div>
            )}

            {d.preview.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Prévia do texto extraído</p>
                <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-2 p-3 text-xs text-foreground">
                  {d.preview.map((p) => p.content).join('\n\n— — —\n\n')}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ConhecimentoPage() {
  const { tenantId } = useAuth();
  const confirm = useConfirm();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [formats, setFormats] = useState<KnowledgeFormats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [typedOpen, setTypedOpen] = useState(false);
  const [typed, setTyped] = useState({ name: '', content: '', context: '' });
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await knowledgeApi.list(tenantId);
      setSources(data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar a base de conhecimento.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    void load();
    agentsApi.list(tenantId).then((r) => {
      const list = r.data.filter((a) => a.status !== 'archived');
      setAgents(list);
      setTarget((t) => t || list[0]?.id || SHARED); // padrão: um agente específico
    }).catch(() => undefined);
    knowledgeApi.formats(tenantId).then((r) => setFormats(r.data)).catch(() => undefined);
  }, [tenantId, load]);

  // Atualiza enquanto há documentos em andamento
  useEffect(() => {
    if (!sources.some((s) => ['uploaded', 'processing', 'indexing'].includes(s.status))) return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [sources, load]);

  const accept = useMemo(() => (formats ? formats.formats.map((f) => `.${f.extension}`).join(',') : '.pdf,.docx,.txt,.md'), [formats]);
  const agentName = (id: string | null) => (id ? agents.find((a) => a.id === id)?.name ?? 'Agente removido' : 'Todos os agentes');
  const visible = filter ? sources.filter((s) => (filter === SHARED ? s.agentId === null : s.agentId === filter)) : sources;

  const uploadFiles = async (files: FileList | null) => {
    if (!tenantId || !files?.length) return;
    setError(null);
    setNotice(null);
    for (const file of Array.from(files)) {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      if (formats && file.size > formats.maxFileBytes) {
        setUploads((u) => [...u, { id, name: file.name, percent: 0, error: `Passa do limite de ${fmtSize(formats.maxFileBytes)}.` }]);
        continue;
      }
      setUploads((u) => [...u, { id, name: file.name, percent: 0 }]);
      try {
        const { data } = await knowledgeApi.upload(tenantId, file, {
          agentId: target === SHARED ? null : target,
          onProgress: (percent) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, percent } : x))),
        });
        setUploads((u) => u.filter((x) => x.id !== id));
        if (data.duplicate) setNotice(`“${file.name}” já estava na base (mesmo conteúdo): nada foi duplicado.`);
        await load();
      } catch (err) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: apiErrorMessage(err, 'Falha no envio.') } : x)));
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const saveTyped = async () => {
    if (!tenantId) return;
    setSaving(true);
    setError(null);
    try {
      await knowledgeApi.createTyped(tenantId, {
        name: typed.name.trim(),
        content: typed.content,
        ...(target !== SHARED ? { agentId: target } : {}),
        ...(typed.context.trim() ? { context: typed.context.trim() } : {}),
      });
      setTyped({ name: '', content: '', context: '' });
      setTypedOpen(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível salvar o conteúdo.'));
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); await load(); } catch (err) { setError(apiErrorMessage(err)); }
  };

  const awaitingAi = sources.some((s) => s.indexStatus === 'awaiting_ai');

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Base de Conhecimento</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Documentos e conteúdos que seus agentes consultam ao responder.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setTypedOpen(true); setError(null); }} className="btn-ghost rounded-lg border border-border px-3 py-2 text-sm inline-flex items-center gap-2">
            <Type className="h-4 w-4" /> Digitar conteúdo
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-primary rounded-lg px-3 py-2 text-sm inline-flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload de arquivo
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" accept={accept} onChange={(e) => void uploadFiles(e.target.files)} />
        </div>
      </div>

      <div className="neural-card p-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Novos conteúdos serão usados por</label>
          <select className={input} value={target} onChange={(e) => setTarget(e.target.value)}>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            <option value={SHARED}>Compartilhado com todos os agentes</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground self-end">
          Formatos: {formats ? formats.formats.map((f) => f.label).join(', ') : 'PDF, DOCX, TXT, MD'} · até {formats ? fmtSize(formats.maxFileBytes) : '50 MB'} por arquivo.
          PDFs escaneados (só imagem) não têm texto e são recusados com aviso.
        </p>
      </div>

      {error && <div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-3 text-sm text-neural-danger">{error}</div>}
      {notice && <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">{notice}</div>}
      {awaitingAi && (
        <div className="rounded-lg border border-neural-warning/40 bg-neural-warning/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-neural-warning" />
          <span>
            Alguns documentos aguardam configuração de IA para a busca semântica. A busca por texto já funciona. Para indexar, conecte uma chave
            OpenAI ou Gemini em <Link href="/configuracoes/ia" className="text-neural-blue hover:underline">Config. IA</Link> e clique em “Reprocessar”.
          </span>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="neural-card p-4 space-y-3">
          {uploads.map((u) => (
            <div key={u.id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{u.name}</span>
                {u.error ? (
                  <button onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
                ) : (
                  <span className="text-xs text-muted-foreground">{u.percent < 100 ? `Enviando — ${u.percent}%` : 'Processando…'}</span>
                )}
              </div>
              {u.error ? (
                <p className="text-xs text-neural-danger">{u.error}</p>
              ) : (
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full bg-primary transition-all" style={{ width: `${u.percent}%` }} /></div>
              )}
            </div>
          ))}
        </div>
      )}

      {typedOpen && (
        <div className="neural-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Novo conteúdo digitado</h3>
          <input className={input} placeholder="Título" value={typed.name} maxLength={255} onChange={(e) => setTyped({ ...typed, name: e.target.value })} />
          <textarea className={`${input} min-h-[12rem] resize-y leading-relaxed`} placeholder="Conteúdo que o agente deve aprender…" value={typed.content} onChange={(e) => setTyped({ ...typed, content: e.target.value })} />
          <input className={input} placeholder="Contexto (opcional): quando usar este conteúdo" value={typed.context} maxLength={2000} onChange={(e) => setTyped({ ...typed, context: e.target.value })} />
          <p className="text-xs text-muted-foreground">Agente: {target === SHARED ? 'compartilhado com todos' : agentName(target)} (altere no seletor acima).</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setTypedOpen(false)} className="btn-ghost rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
            <button disabled={saving || !typed.name.trim() || !typed.content.trim()} onClick={() => void saveTyped()} className="btn-primary rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      )}

      {agents.length > 0 && sources.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Mostrar:</span>
          <select className="rounded-lg border border-border bg-surface-1 px-2 py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos os documentos</option>
            <option value={SHARED}>Compartilhados</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : visible.length === 0 ? (
        <div className="neural-card p-10 text-center space-y-2">
          <BookOpen className="mx-auto h-8 w-8 text-primary" />
          <p className="text-sm font-semibold text-foreground">Nenhum documento ainda</p>
          <p className="text-xs text-muted-foreground">Envie arquivos ou digite conteúdos para o seu agente consultar.</p>
        </div>
      ) : (
        <div className="neural-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Agente</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">Tamanho</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Data</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visible.map((s) => {
                const st = STATUS[s.status];
                return (
                  <tr key={s.id}>
                    <td className="p-3">
                      <p className="max-w-[260px] truncate font-medium text-foreground" title={s.name}>{s.name}</p>
                      {s.status === 'ready' && s.indexStatus === 'awaiting_ai' && <p className="text-[11px] text-neural-warning">Aguardando configuração de IA</p>}
                      {s.status === 'ready' && s.indexStatus === 'failed' && <p className="text-[11px] text-neural-warning">Busca semântica falhou (texto OK)</p>}
                    </td>
                    <td className="p-3 text-muted-foreground">{agentName(s.agentId)}</td>
                    <td className="p-3">{typeLabel(s)}</td>
                    <td className="p-3 tabular-nums">{fmtSize(s.fileSizeBytes)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.className}`}>
                        {st.spin ? <Loader2 className="h-3 w-3 animate-spin" /> : s.status === 'ready' ? <CheckCircle2 className="h-3 w-3" /> : s.status === 'failed' ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button title="Ver detalhes" aria-label="Ver detalhes" onClick={() => setDetails(s.id)} className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4" /></button>
                        {s.storageKey && (
                          <button title="Baixar" aria-label="Baixar" onClick={() => tenantId && void knowledgeApi.download(tenantId, s).catch((err) => setError(apiErrorMessage(err)))} className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
                        )}
                        {(s.status === 'failed' || s.status === 'ready') && (
                          <button title={s.status === 'failed' ? 'Tentar novamente' : 'Reprocessar'} aria-label="Reprocessar" onClick={() => tenantId && void act(() => knowledgeApi.retry(tenantId, s.id))} className="rounded p-1.5 text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
                        )}
                        <button
                          title="Excluir"
                          aria-label="Excluir"
                          onClick={async () => { if (tenantId && await confirm({ title: `Excluir “${s.name}”?`, description: 'O arquivo, o texto e os índices serão removidos.', action: 'Excluir' })) void act(() => knowledgeApi.remove(tenantId, s.id)); }}
                          className="rounded p-1.5 text-muted-foreground hover:text-neural-danger"
                        ><Trash2 className="h-4 w-4" /></button>
                      </div>
                      {s.status === 'failed' && (
                        <div className="mt-1 flex justify-end gap-2 text-[11px]">
                          <button onClick={() => setDetails(s.id)} className="text-neural-blue hover:underline">Ver detalhes</button>
                          <button onClick={() => tenantId && void act(() => knowledgeApi.retry(tenantId, s.id))} className="text-neural-blue hover:underline">Tentar novamente</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {details && tenantId && (
        <DetailsPanel tenantId={tenantId} sourceId={details} agents={agents} onClose={() => setDetails(null)} onChanged={() => void load()} />
      )}
    </div>
  );
}
