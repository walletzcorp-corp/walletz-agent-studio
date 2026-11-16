'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Smartphone, Plus, Loader2, Copy, Check, KeyRound, Trash2, ExternalLink, ShieldCheck, AlertTriangle, Lock, Webhook, Bot,
} from 'lucide-react';
import { useAuth } from '../../../../hooks/use-auth';
import { agentsApi, type Agent } from '../../../../lib/agents-api';
import { whatsappApi, type WebhookSetup, type WhatsappAccount } from '../../../../lib/whatsapp-api';
import { apiErrorMessage, plansApi, type TenantPlanSummary } from '../../../../lib/studio-api';

const input = 'w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50';

const STATUS: Record<WhatsappAccount['status'], { label: string; className: string }> = {
  connected: { label: 'Conectado', className: 'badge-success' },
  pending: { label: 'Pendente', className: 'badge-warning' },
  disconnected: { label: 'Desconectado', className: 'bg-surface-2 text-muted-foreground border border-border' },
  suspended: { label: 'Suspenso', className: 'badge-danger' },
  error: { label: 'Token expirado / erro', className: 'badge-danger' },
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        <code className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-mono break-all text-foreground">{value}</code>
        <button
          onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5 shrink-0"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-neural-success" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

function WebhookInstructions({ setup }: { setup: WebhookSetup }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Webhook className="h-4 w-4 text-primary" /> Configure o webhook no app da Meta</p>
      <ol className="list-decimal pl-4 space-y-1 text-xs text-muted-foreground">
        <li>No <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline">painel de apps da Meta</a>, abra o seu app → <strong>WhatsApp → Configuração</strong>.</li>
        <li>Em <strong>Webhook</strong>, clique em Editar e cole a URL de retorno e o token de verificação abaixo.</li>
        <li>Clique em <strong>Verificar e salvar</strong> e, em “Campos do webhook”, assine <code>messages</code>.</li>
      </ol>
      <CopyField label="URL de retorno (Callback URL)" value={setup.callbackUrl} />
      <CopyField label="Token de verificação (Verify token)" value={setup.verifyToken} />
      {setup.callbackUrl.includes('localhost') && (
        <p className="text-[11px] text-neural-warning">Esta URL é local: a Meta não alcança localhost. Em produção ela é pública; para testar localmente use um túnel (ex.: cloudflared) e defina PUBLIC_API_URL.</p>
      )}
    </div>
  );
}

function ConnectForm({
  tenantId, agents, onDone, onCancel,
}: {
  tenantId: string;
  agents: Agent[];
  onDone: (setup: WebhookSetup, note: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({ phoneNumberId: '', wabaId: '', appId: '', appSecret: '', accessToken: '', agentId: agents.find((a) => a.status === 'published')?.id ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const ready = v.phoneNumberId && v.wabaId && v.appId && v.appSecret && v.accessToken;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await whatsappApi.connectAccount(tenantId, {
        phoneNumberId: v.phoneNumberId.trim(),
        wabaId: v.wabaId.trim(),
        appId: v.appId.trim(),
        appSecret: v.appSecret.trim(),
        accessToken: v.accessToken.trim(),
        ...(v.agentId ? { agentId: v.agentId } : {}),
      });
      const notes = [
        data.subscribed ? 'App inscrito na conta WhatsApp Business.' : 'Não foi possível inscrever o app na WABA automaticamente; confira as permissões do token.',
        data.tokenExpiresAt ? `Atenção: este token expira em ${new Date(data.tokenExpiresAt).toLocaleString('pt-BR')}. Use um token permanente de Usuário do Sistema.` : 'Token permanente.',
      ];
      onDone(data.webhook, notes.join(' '));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="neural-card p-5 space-y-4 border-primary/30">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Conectar com o app Meta da sua empresa</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Use a API oficial do WhatsApp (Cloud API) com a sua conta Meta. As mensagens são cobradas pela Meta na sua conta.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-surface-1 p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">Onde encontro esses dados?</summary>
        <ol className="list-decimal pl-4 mt-2 space-y-1">
          <li>Em <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline">developers.facebook.com/apps</a>, crie (ou abra) um app do tipo <strong>Empresa</strong> e adicione o produto <strong>WhatsApp</strong>.</li>
          <li><strong>App ID</strong> e <strong>App Secret</strong>: Configurações do app → Básico.</li>
          <li><strong>Phone Number ID</strong> e <strong>WABA ID</strong>: WhatsApp → Configuração da API.</li>
          <li><strong>Token permanente</strong>: no <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline">Gerenciador de Negócios → Usuários do sistema</a>, crie um usuário (Admin), atribua o app e a conta WhatsApp e gere um token sem expiração com <code>whatsapp_business_messaging</code> e <code>whatsapp_business_management</code>.</li>
        </ol>
      </details>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Phone Number ID</label>
          <input className={`${input} font-mono`} value={v.phoneNumberId} onChange={set('phoneNumberId')} inputMode="numeric" placeholder="1234567890…" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">WABA ID (conta do WhatsApp Business)</label>
          <input className={`${input} font-mono`} value={v.wabaId} onChange={set('wabaId')} inputMode="numeric" placeholder="1029384756…" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">App ID</label>
          <input className={`${input} font-mono`} value={v.appId} onChange={set('appId')} inputMode="numeric" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">App Secret</label>
          <input className={`${input} font-mono`} type="password" autoComplete="off" value={v.appSecret} onChange={set('appSecret')} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Token de acesso permanente</label>
        <input className={`${input} font-mono`} type="password" autoComplete="off" value={v.accessToken} onChange={set('accessToken')} placeholder="EAAG…" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Agente que responde neste número</label>
        <select className={input} value={v.agentId} onChange={set('agentId')}>
          <option value="">Primeiro agente publicado</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.status !== 'published' ? ' (não publicado)' : ''}</option>)}
        </select>
      </div>

      <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px text-neural-success" />
        Validamos tudo na Meta antes de salvar (token, App Secret, número e conta). Token e App Secret ficam criptografados e nunca são exibidos de novo.
      </p>
      {error && <p className="text-xs text-neural-danger">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy || !ready} onClick={submit} className="btn-primary rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Validar e conectar
        </button>
        <button onClick={onCancel} className="btn-ghost rounded-lg px-4 py-2.5 text-sm border border-border">Cancelar</button>
      </div>
    </div>
  );
}

function AccountCard({
  tenantId, account, agents, onChanged,
}: {
  tenantId: string;
  account: WhatsappAccount;
  agents: Agent[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [setup, setSetup] = useState<WebhookSetup | null>(null);
  const [rotating, setRotating] = useState(false);
  const [cred, setCred] = useState({ appId: '', accessToken: '', appSecret: '' });
  const status = STATUS[account.status];
  const isClient = account.credentialSource === 'client';

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    setMsg(null);
    try {
      const text = await fn();
      if (text) setMsg({ ok: true, text });
      onChanged();
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="neural-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366]"><Smartphone className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-foreground">{account.phoneNumber ?? account.phoneNumberId}</p>
            <p className="text-xs text-muted-foreground">
              {account.displayName ?? 'Sem nome verificado'} · {isClient ? 'App Meta da sua empresa' : 'App Walletz (Embedded Signup)'}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}>{status.label}</span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1 min-w-[240px] flex-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> Agente que responde</label>
          <select
            className={input}
            value={account.agentId ?? ''}
            disabled={busy}
            onChange={(e) => void run(async () => {
              await whatsappApi.setAgent(tenantId, account.id, e.target.value || null);
              return 'Agente atualizado.';
            })}
          >
            <option value="">Primeiro agente publicado</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.status !== 'published' ? ' (não publicado)' : ''}</option>)}
          </select>
        </div>
      </div>

      {setup && <WebhookInstructions setup={setup} />}

      {rotating && (
        <div className="rounded-lg border border-border bg-surface-1 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Informe o App ID e o que deseja trocar. A nova credencial é validada na Meta antes de substituir a atual.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className={`${input} font-mono`} placeholder="App ID" value={cred.appId} onChange={(e) => setCred({ ...cred, appId: e.target.value })} />
            <input className={`${input} font-mono`} type="password" autoComplete="off" placeholder="Novo token (opcional)" value={cred.accessToken} onChange={(e) => setCred({ ...cred, accessToken: e.target.value })} />
            <input className={`${input} font-mono`} type="password" autoComplete="off" placeholder="Novo App Secret (opcional)" value={cred.appSecret} onChange={(e) => setCred({ ...cred, appSecret: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button
              disabled={busy || !cred.appId || (!cred.accessToken && !cred.appSecret && isClient)}
              onClick={() => void run(async () => {
                await whatsappApi.updateCredentials(tenantId, account.id, {
                  appId: cred.appId.trim(),
                  ...(cred.accessToken.trim() ? { accessToken: cred.accessToken.trim() } : {}),
                  ...(cred.appSecret.trim() ? { appSecret: cred.appSecret.trim() } : {}),
                });
                setRotating(false);
                setCred({ appId: '', accessToken: '', appSecret: '' });
                return 'Credenciais validadas e atualizadas.';
              })}
              className="btn-primary rounded-lg px-4 py-2 text-sm"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar e salvar'}
            </button>
            <button onClick={() => setRotating(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm border border-border">Cancelar</button>
          </div>
        </div>
      )}

      {msg && <p className={`text-xs ${msg.ok ? 'text-neural-success' : 'text-neural-danger'}`}>{msg.text}</p>}

      <div className="flex flex-wrap gap-2">
        {isClient && (
          <button
            disabled={busy}
            onClick={() => void run(async () => {
              setSetup(setup ? null : (await whatsappApi.webhookSetup(tenantId, account.id)).data);
            })}
            className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5"
          >
            <Webhook className="h-3.5 w-3.5" /> {setup ? 'Ocultar webhook' : 'Ver dados do webhook'}
          </button>
        )}
        <button disabled={busy} onClick={() => setRotating(true)} className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5" /> {isClient ? 'Trocar token / App Secret' : 'Usar app da minha empresa'}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (!window.confirm('Desconectar este número? O agente deixa de responder por ele.')) return;
            void run(async () => { await whatsappApi.disconnectAccount(tenantId, account.id); });
          }}
          className="btn-ghost rounded-lg px-3 py-2 text-xs border border-neural-danger/40 text-neural-danger inline-flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" /> Desconectar
        </button>
      </div>
    </div>
  );
}

export default function WhatsappPage() {
  const { tenantId } = useAuth();
  const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [plan, setPlan] = useState<TenantPlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [justConnected, setJustConnected] = useState<{ setup: WebhookSetup; note: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [p, a] = await Promise.all([plansApi.summary(tenantId), agentsApi.list(tenantId)]);
      setPlan(p.data);
      setAgents(a.data.filter((x) => x.status !== 'archived'));
      if (p.data.enabledFeatures.whatsapp) setAccounts((await whatsappApi.listAccounts(tenantId)).data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar o WhatsApp.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const enabled = plan?.enabledFeatures.whatsapp ?? false;
  const limit = plan?.plan.limits.whatsappNumbers ?? 0;
  const embeddedAvailable = Boolean(process.env.NEXT_PUBLIC_META_APP_ID) && !process.env.NEXT_PUBLIC_META_APP_ID?.startsWith('AGUARDANDO');

  return (
    <div className="page-container space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">WhatsApp</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Conecte o número oficial da sua empresa (API do WhatsApp da Meta) e escolha o agente que responde. <Link href="/docs/whatsapp" target="_blank" className="text-neural-blue hover:underline">Guia passo a passo</Link></p>
        </div>
        {enabled && !connecting && accounts.length < limit && (
          <button onClick={() => { setConnecting(true); setJustConnected(null); }} className="btn-primary rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Conectar número
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-3 text-sm text-neural-danger">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : !enabled ? (
        <div className="neural-card p-8 text-center space-y-2">
          <Lock className="h-7 w-7 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">WhatsApp oficial não está no plano {plan?.plan.name}</p>
          <p className="text-xs text-muted-foreground">Disponível a partir do Pro (1 número). <Link href="/billing" className="text-neural-blue hover:underline">Ver planos</Link></p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Números: {accounts.length} de {limit} no plano {plan?.plan.name}. Mensagens, templates e aprovações seguem as regras e tarifas da Meta, cobradas na sua conta.
          </p>

          {justConnected && (
            <div className="space-y-2">
              <div className="rounded-lg border border-neural-success/40 bg-neural-success/5 p-3 text-sm text-foreground flex items-start gap-2">
                <Check className="h-4 w-4 text-neural-success shrink-0 mt-0.5" /> Número conectado. {justConnected.note}
              </div>
              <WebhookInstructions setup={justConnected.setup} />
            </div>
          )}

          {connecting && tenantId && (
            <ConnectForm
              tenantId={tenantId}
              agents={agents}
              onCancel={() => setConnecting(false)}
              onDone={(setup, note) => { setConnecting(false); setJustConnected({ setup, note }); void load(); }}
            />
          )}

          {accounts.length === 0 && !connecting && (
            <div className="neural-card p-8 text-center space-y-2">
              <Smartphone className="h-7 w-7 text-[#25D366] mx-auto" />
              <p className="text-sm font-semibold text-foreground">Nenhum número conectado</p>
              <p className="text-xs text-muted-foreground">Clique em “Conectar número” e informe as credenciais do app Meta da sua empresa.</p>
            </div>
          )}

          <div className="space-y-3">
            {accounts.map((a) => tenantId && <AccountCard key={a.id} tenantId={tenantId} account={a} agents={agents} onChanged={load} />)}
          </div>

          {agents.every((a) => a.status !== 'published') && accounts.length > 0 && (
            <p className="text-xs text-neural-warning inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Nenhum agente publicado: o número recebe mensagens, mas publique um agente para responder automaticamente.
            </p>
          )}

          {embeddedAvailable && (
            <p className="text-xs text-muted-foreground">
              Prefere não criar um app na Meta? <Link href="/canais/whatsapp/embedded" className="text-neural-blue hover:underline inline-flex items-center gap-1">Conectar pelo app da Walletz (Embedded Signup) <ExternalLink className="h-3 w-3" /></Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
