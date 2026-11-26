'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Plus, Copy, Check, Loader2, Trash2, Power, AlertTriangle, Save } from 'lucide-react';
import { useAuth } from '../../../../hooks/use-auth';
import { agentsApi, type Agent } from '../../../../lib/agents-api';
import {
  apiErrorMessage, plansApi, webchatApi, widgetScriptUrl,
  type TenantPlanSummary, type WebchatWidget,
} from '../../../../lib/studio-api';
import { useConfirm } from '../../../../components/confirm-dialog';

function parseOrigins(text: string): string[] {
  return text.split(/[\s,]+/).map((o) => o.trim()).filter(Boolean);
}

function EmbedCode({ publicKey }: { publicKey: string }) {
  const [copied, setCopied] = useState(false);
  const code = `<script src="${widgetScriptUrl()}" data-key="${publicKey}" async></script>`;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Código para colar no site (antes de &lt;/body&gt;)</label>
      <div className="flex items-start gap-2">
        <pre className="flex-1 overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 text-[11px] font-mono text-foreground whitespace-pre-wrap break-all">{code}</pre>
        <button
          onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5 shrink-0"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-neural-success" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

function WidgetForm({
  agents, initial, busy, onSubmit, onCancel, submitLabel,
}: {
  agents: Agent[];
  initial: { agentId: string; name: string; origins: string; title: string; welcome: string; color: string };
  busy: boolean;
  onSubmit: (v: typeof initial) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const input = 'w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50';
  const agent = agents.find((a) => a.id === v.agentId);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Nome interno</label>
          <input className={input} value={v.name} onChange={set('name')} placeholder="Site principal" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Agente que responde</label>
          <select className={input} value={v.agentId} onChange={set('agentId')}>
            <option value="">Escolha…</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.status !== 'published' ? ' (não publicado)' : ''}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Título da janela</label>
          <input className={input} value={v.title} onChange={set('title')} maxLength={60} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Cor</label>
          <input type="color" className="h-9 w-full rounded-lg border border-border bg-surface-1" value={v.color} onChange={set('color')} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Mensagem de boas-vindas</label>
        <textarea className={input} rows={2} value={v.welcome} onChange={set('welcome')} maxLength={500} placeholder="Olá! Como posso ajudar?" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Sites autorizados (um por linha)</label>
        <textarea className={`${input} font-mono text-xs`} rows={2} value={v.origins} onChange={set('origins')} placeholder="https://www.suaempresa.com.br" />
        <p className="text-[11px] text-muted-foreground">Recomendado: só esses sites conseguem usar o widget. Em branco, qualquer site com o código pode usá-lo, e o consumo de IA sai da sua conta.</p>
      </div>
      {agent && agent.status !== 'published' && (
        <p className="text-xs text-neural-warning inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> O agente precisa estar publicado para responder no site. <Link href={`/agentes/${agent.id}`} className="text-neural-blue hover:underline">Abrir agente</Link>
        </p>
      )}
      <div className="flex gap-2">
        <button disabled={busy || !v.agentId || v.name.trim().length < 2} onClick={() => onSubmit(v)} className="btn-primary rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {submitLabel}
        </button>
        {onCancel && <button onClick={onCancel} className="btn-ghost rounded-lg px-4 py-2 text-sm border border-border">Cancelar</button>}
      </div>
    </div>
  );
}

export default function WebchatPage() {
  const { tenantId } = useAuth();
  const confirm = useConfirm();
  const [widgets, setWidgets] = useState<WebchatWidget[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [plan, setPlan] = useState<TenantPlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [w, a, p] = await Promise.all([webchatApi.list(tenantId), agentsApi.list(tenantId), plansApi.summary(tenantId)]);
      setWidgets(w.data);
      setAgents(a.data.filter((x) => x.status !== 'archived'));
      setPlan(p.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar o webchat.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); await load(); return true; } catch (err) { setError(apiErrorMessage(err)); return false; } finally { setBusy(false); }
  };

  const limit = plan?.plan.limits.webchatWidgets ?? 0;
  const enabled = plan?.enabledFeatures.webchat ?? true;

  return (
    <div className="page-container space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Webchat</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Publique seu agente no seu site. As conversas chegam em Conversas. <Link href="/docs/webchat" target="_blank" className="text-neural-blue hover:underline">Guia de instalação (WordPress, Wix, Shopify…)</Link></p>
        </div>
        {enabled && !creating && widgets.length < limit && (
          <button onClick={() => setCreating(true)} className="btn-primary rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo widget
          </button>
        )}
      </div>

      {plan && <p className="text-xs text-muted-foreground">Widgets: {widgets.length} de {limit} no plano {plan.plan.name}. As respostas usam a chave de IA da sua conta (<Link href="/configuracoes/ia" className="text-neural-blue hover:underline">Config. IA</Link>).</p>}
      {error && <div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-3 text-sm text-neural-danger">{error}</div>}

      {creating && tenantId && (
        <div className="neural-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Novo widget</h3>
          <WidgetForm
            agents={agents}
            busy={busy}
            submitLabel="Criar widget"
            initial={{ agentId: agents.find((a) => a.status === 'published')?.id ?? agents[0]?.id ?? '', name: 'Site', origins: '', title: 'Fale com a gente', welcome: '', color: '#0f766e' }}
            onCancel={() => setCreating(false)}
            onSubmit={async (v) => {
              const ok = await act(() => webchatApi.create(tenantId, {
                agentId: v.agentId, name: v.name.trim(), allowedOrigins: parseOrigins(v.origins),
                title: v.title, primaryColor: v.color, ...(v.welcome ? { welcomeMessage: v.welcome } : {}),
              }));
              if (ok) setCreating(false);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : widgets.length === 0 && !creating ? (
        <div className="neural-card p-8 text-center space-y-2">
          <Globe className="h-7 w-7 text-primary mx-auto" />
          <p className="text-sm font-semibold text-foreground">Nenhum widget criado</p>
          <p className="text-xs text-muted-foreground">Crie um widget, escolha o agente e cole o código no seu site.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {widgets.map((w) => {
            const agent = agents.find((a) => a.id === w.agentId);
            return (
              <div key={w.id} className="neural-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-lg" style={{ background: w.primaryColor }} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{w.name}</p>
                      <p className="text-xs text-muted-foreground">Agente: {agent?.name ?? '—'} · {w.allowedOrigins.length > 0 ? w.allowedOrigins.join(', ') : 'qualquer site'}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${w.isEnabled ? 'badge-success' : 'bg-surface-2 text-muted-foreground border border-border'}`}>
                    {w.isEnabled ? 'Ativo' : 'Desativado'}
                  </span>
                </div>
                <EmbedCode publicKey={w.publicKey} />
                {editing === w.id && tenantId ? (
                  <WidgetForm
                    agents={agents}
                    busy={busy}
                    submitLabel="Salvar"
                    initial={{ agentId: w.agentId, name: w.name, origins: w.allowedOrigins.join('\n'), title: w.title, welcome: w.welcomeMessage ?? '', color: w.primaryColor }}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (v) => {
                      const ok = await act(() => webchatApi.update(tenantId, w.id, {
                        agentId: v.agentId, name: v.name.trim(), allowedOrigins: parseOrigins(v.origins),
                        title: v.title, welcomeMessage: v.welcome, primaryColor: v.color,
                      }));
                      if (ok) setEditing(null);
                    }}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setEditing(w.id)} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border">Editar</button>
                    <button disabled={busy} onClick={() => tenantId && act(() => webchatApi.update(tenantId, w.id, { isEnabled: !w.isEnabled }))} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5">
                      <Power className="h-3.5 w-3.5" /> {w.isEnabled ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      disabled={busy}
                      onClick={async () => { if (tenantId && await confirm({ title: 'Remover este widget?', description: 'O código deixa de funcionar no site.', action: 'Remover' })) void act(() => webchatApi.remove(tenantId, w.id)); }}
                      className="btn-ghost rounded-lg px-3 py-2 text-xs border border-neural-danger/40 text-neural-danger inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
