'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Webhook, Plus, Loader2, Trash2, Power, Send, KeyRound, Copy, Check, Lock } from 'lucide-react';
import { useAuth } from '../../../../hooks/use-auth';
import {
  apiErrorMessage, plansApi, webhooksApi,
  type OutboundWebhook, type TenantPlanSummary,
} from '../../../../lib/studio-api';

function SecretBox({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-neural-warning/40 bg-neural-warning/5 p-4 space-y-2">
      <p className="text-sm font-semibold text-foreground">Guarde o segredo de assinatura agora</p>
      <p className="text-xs text-muted-foreground">Ele não será exibido de novo. Use-o para validar o cabeçalho <code>X-Walletz-Signature</code>.</p>
      <div className="flex gap-2">
        <code className="flex-1 rounded border border-border bg-surface-2 px-3 py-2 text-xs font-mono break-all">{secret}</code>
        <button onClick={() => { void navigator.clipboard.writeText(secret); setCopied(true); }} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copiar
        </button>
      </div>
      <button onClick={onClose} className="text-xs text-neural-blue hover:underline">Já guardei</button>
    </div>
  );
}

export default function WebhooksPage() {
  const { tenantId } = useAuth();
  const [hooks, setHooks] = useState<OutboundWebhook[]>([]);
  const [events, setEvents] = useState<Array<{ name: string; description: string }>>([]);
  const [plan, setPlan] = useState<TenantPlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<string[]>(['message.received', 'message.replied']);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [p, e] = await Promise.all([plansApi.summary(tenantId), webhooksApi.events(tenantId)]);
      setPlan(p.data);
      setEvents(e.data);
      if (p.data.enabledFeatures.outboundWebhooks) setHooks((await webhooksApi.list(tenantId)).data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar os webhooks.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null); setInfo(null);
    try { await fn(); await load(); return true; } catch (err) { setError(apiErrorMessage(err)); return false; } finally { setBusy(false); }
  };

  const enabled = plan?.enabledFeatures.outboundWebhooks ?? false;
  const limit = plan?.plan.limits.outboundWebhooks ?? 0;

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/integracoes" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Webhooks de saída</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Envie eventos das conversas e reuniões para o seu sistema, com assinatura HMAC-SHA256. <Link href="/docs/webhooks" target="_blank" className="text-neural-blue hover:underline">Documentação para desenvolvedores</Link></p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-3 text-sm text-neural-danger">{error}</div>}
      {info && <div className="rounded-lg border border-neural-success/40 bg-neural-success/5 p-3 text-sm text-foreground">{info}</div>}
      {secret && <SecretBox secret={secret} onClose={() => setSecret(null)} />}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : !enabled ? (
        <div className="neural-card p-8 text-center space-y-2">
          <Lock className="h-7 w-7 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">Webhooks de saída não estão no plano {plan?.plan.name}</p>
          <p className="text-xs text-muted-foreground">Disponível a partir do Pro (1 webhook) e Business (catálogo + API). <Link href="/billing" className="text-neural-blue hover:underline">Ver planos</Link></p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Webhooks: {hooks.length} de {limit}. Entregas com falha são repetidas automaticamente (até 6 tentativas).</p>

          {creating && tenantId ? (
            <div className="neural-card p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">URL (https)</label>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seusistema.com.br/walletz/webhook" className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Eventos</label>
                {events.map((e) => (
                  <label key={e.name} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="accent-primary" checked={selected.includes(e.name)} onChange={(ev) => setSelected(ev.target.checked ? [...selected, e.name] : selected.filter((x) => x !== e.name))} />
                    <code className="text-xs">{e.name}</code> <span className="text-xs text-muted-foreground">{e.description}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy || !url || selected.length === 0}
                  onClick={async () => {
                    let created: string | null = null;
                    const ok = await act(async () => { created = (await webhooksApi.create(tenantId, { url: url.trim(), events: selected })).data.secret; });
                    if (ok) { setSecret(created); setCreating(false); setUrl(''); }
                  }}
                  className="btn-primary rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar webhook
                </button>
                <button onClick={() => setCreating(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm border border-border">Cancelar</button>
              </div>
            </div>
          ) : hooks.length < limit && (
            <button onClick={() => setCreating(true)} className="btn-primary rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Novo webhook</button>
          )}

          <div className="space-y-3">
            {hooks.map((h) => (
              <div key={h.id} className="neural-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Webhook className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-foreground truncate">{h.url}</p>
                      <p className="text-xs text-muted-foreground">{h.events.join(', ')}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${!h.isActive ? 'bg-surface-2 text-muted-foreground border border-border' : h.consecutiveFailures > 0 ? 'badge-warning' : 'badge-success'}`}>
                    {!h.isActive ? 'Pausado' : h.consecutiveFailures > 0 ? `${h.consecutiveFailures} falha(s) seguidas` : 'Ativo'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Última entrega: {h.lastDeliveryAt ? new Date(h.lastDeliveryAt).toLocaleString('pt-BR') : '—'}
                  {h.lastDeliveryStatus ? ` · HTTP ${h.lastDeliveryStatus}` : ''}{h.lastDeliveryError ? ` · ${h.lastDeliveryError}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} onClick={() => tenantId && act(async () => {
                    const r = (await webhooksApi.test(tenantId, h.id)).data;
                    setInfo(r.ok ? `Teste entregue (HTTP ${r.status}).` : `Teste falhou: ${r.error}`);
                  })} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Enviar teste</button>
                  <button disabled={busy} onClick={() => tenantId && act(() => webhooksApi.update(tenantId, h.id, { isActive: !h.isActive }))} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5"><Power className="h-3.5 w-3.5" /> {h.isActive ? 'Pausar' : 'Reativar'}</button>
                  <button disabled={busy} onClick={() => tenantId && act(async () => { setSecret((await webhooksApi.rotateSecret(tenantId, h.id)).data.secret); })} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Novo segredo</button>
                  <button disabled={busy} onClick={() => { if (tenantId && window.confirm('Remover este webhook?')) void act(() => webhooksApi.remove(tenantId, h.id)); }} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-neural-danger/40 text-neural-danger inline-flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Remover</button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-surface-1 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Como validar a assinatura</p>
            <p>Calcule HMAC-SHA256 com o segredo sobre <code>{'{X-Walletz-Timestamp}.{corpo bruto}'}</code> e compare com <code>X-Walletz-Signature</code> (formato <code>sha256=…</code>). Rejeite timestamps com mais de 5 minutos.</p>
          </div>
        </>
      )}
    </div>
  );
}
