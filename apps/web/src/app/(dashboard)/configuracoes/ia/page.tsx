'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Brain, CheckCircle2, XCircle, AlertTriangle, Shield, ExternalLink,
  RefreshCw, Star, Trash2, KeyRound, Loader2, Plus, Info, Activity,
} from 'lucide-react';
import { useAuth } from '../../../../hooks/use-auth';
import {
  aiConnectionsApi, apiErrorMessage, plansApi,
  type AiConnection, type AiProvider, type AiProviderInfo, type TenantPlanSummary,
} from '../../../../lib/studio-api';
import { useConfirm } from '../../../../components/confirm-dialog';

const STATUS = {
  active: { label: 'Ativa', className: 'badge-success', icon: CheckCircle2 },
  invalid: { label: 'Chave recusada', className: 'badge-danger', icon: XCircle },
  billing_error: { label: 'Sem crédito / faturamento', className: 'badge-warning', icon: AlertTriangle },
  revoked: { label: 'Revogada', className: 'badge-danger', icon: XCircle },
} as const;

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

/* ── Conexão existente ── */
function ConnectionCard({
  tenantId, connection, provider, onChanged,
}: {
  tenantId: string;
  connection: AiConnection;
  provider: AiProviderInfo | undefined;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [rotating, setRotating] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [models, setModels] = useState<string[] | null>(null);
  const [model, setModel] = useState(connection.defaultModel);
  const status = STATUS[connection.status];
  const StatusIcon = status.icon;

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    setMessage(null);
    try {
      setMessage({ ok: true, text: await fn() });
      onChanged();
    } catch (err) {
      setMessage({ ok: false, text: apiErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const loadModels = async () => {
    try {
      const { data } = await aiConnectionsApi.models(tenantId, connection.id);
      setModels(data.length > 0 ? data : [connection.defaultModel]);
    } catch (err) {
      setMessage({ ok: false, text: apiErrorMessage(err) });
    }
  };

  return (
    <div className={`neural-card p-5 space-y-4 ${connection.isDefault ? 'border-primary/40' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-primary/10 text-primary shrink-0">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{connection.providerName}</p>
              {connection.isDefault && <span className="badge-primary text-[10px] px-2 py-0.5 rounded-full font-semibold">Padrão</span>}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{connection.maskedKey} · {connection.defaultModel}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}>
          <StatusIcon className="h-3 w-3" /> {status.label}
        </span>
      </div>

      {connection.status !== 'active' && connection.lastError && (
        <div className="rounded-lg border border-neural-warning/30 bg-neural-warning/5 p-3 text-xs text-foreground">
          {connection.lastError}
          {connection.status === 'billing_error' && provider && (
            <a href={provider.links.buyCredits} target="_blank" rel="noopener noreferrer" className="ml-1 text-neural-blue hover:underline inline-flex items-center gap-1">
              Abrir faturamento no provedor <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Última validação: {fmtDate(connection.lastValidatedAt)}
        {connection.lastErrorAt && connection.status !== 'active' ? ` · Último erro: ${fmtDate(connection.lastErrorAt)}` : ''}
      </p>

      {/* Modelo */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1 flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Modelo usado pelos agentes</label>
          {models ? (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <button onClick={loadModels} className="w-full text-left rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground hover:border-primary/40">
              {connection.defaultModel} <span className="text-xs text-muted-foreground">(clique para ver os modelos da sua conta)</span>
            </button>
          )}
        </div>
        {models && model !== connection.defaultModel && (
          <button
            disabled={busy !== null}
            onClick={() => run('model', async () => {
              await aiConnectionsApi.update(tenantId, connection.id, { model });
              return `Modelo alterado para ${model}.`;
            })}
            className="btn-primary rounded-lg px-4 py-2 text-sm"
          >
            {busy === 'model' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar modelo'}
          </button>
        )}
      </div>

      {rotating && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-1 p-3">
          <label className="text-xs font-medium text-muted-foreground">Nova chave de API</label>
          <input
            type="password"
            autoComplete="off"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={provider?.keyHint ?? 'Cole a nova chave'}
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
          />
          <p className="text-[11px] text-muted-foreground">A nova chave é testada antes de substituir a atual.</p>
          <div className="flex gap-2">
            <button
              disabled={busy !== null || newKey.trim().length < 16}
              onClick={() => run('rotate', async () => {
                await aiConnectionsApi.update(tenantId, connection.id, { apiKey: newKey.trim() });
                setNewKey('');
                setRotating(false);
                return 'Chave substituída e validada.';
              })}
              className="btn-primary rounded-lg px-4 py-2 text-sm"
            >
              {busy === 'rotate' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar e substituir'}
            </button>
            <button onClick={() => { setRotating(false); setNewKey(''); }} className="btn-ghost rounded-lg px-4 py-2 text-sm border border-border">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.ok ? 'text-neural-success' : 'text-neural-danger'}`}>{message.text}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy !== null}
          onClick={() => run('test', async () => (await aiConnectionsApi.test(tenantId, connection.id)).data.message)}
          className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5"
        >
          {busy === 'test' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {connection.status === 'active' ? 'Testar' : 'Testar novamente'}
        </button>
        {!connection.isDefault && (
          <button
            disabled={busy !== null}
            onClick={() => run('default', async () => {
              await aiConnectionsApi.setDefault(tenantId, connection.id);
              return 'Agora esta é a conexão padrão.';
            })}
            className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5"
          >
            <Star className="h-3.5 w-3.5" /> Tornar padrão
          </button>
        )}
        <button
          disabled={busy !== null}
          onClick={() => setRotating(true)}
          className="btn-ghost rounded-lg px-3 py-2 text-xs border border-border inline-flex items-center gap-1.5"
        >
          <KeyRound className="h-3.5 w-3.5" /> Trocar chave
        </button>
        <button
          disabled={busy !== null}
          onClick={async () => {
            if (!(await confirm({ title: 'Revogar esta conexão?', description: 'A chave será apagada da Walletz e os agentes que a usam param de responder até haver outra conexão.', action: 'Revogar' }))) return;
            void run('remove', async () => {
              await aiConnectionsApi.remove(tenantId, connection.id);
              return 'Conexão revogada.';
            });
          }}
          className="btn-ghost rounded-lg px-3 py-2 text-xs border border-neural-danger/40 text-neural-danger inline-flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" /> Revogar
        </button>
      </div>
    </div>
  );
}

/* ── Nova conexão ── */
function NewConnection({
  tenantId, providers, onCreated, onCancel,
}: {
  tenantId: string;
  providers: AiProviderInfo[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [providerId, setProviderId] = useState<AiProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = providers.find((p) => p.id === providerId);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await aiConnectionsApi.create(tenantId, { provider: providerId, apiKey: apiKey.trim(), ...(model.trim() ? { model: model.trim() } : {}) });
      setApiKey('');
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="neural-card p-5 space-y-4 border-primary/30">
      <h3 className="text-sm font-semibold text-foreground">Conectar provedor de IA</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => setProviderId(p.id)}
            className={`rounded-lg border p-3 text-sm font-medium transition-colors ${providerId === p.id ? 'border-primary/50 bg-primary/5 text-foreground' : 'border-border bg-surface-1 text-muted-foreground hover:border-border/60'}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {provider && (
        <ol className="space-y-2 text-xs text-muted-foreground list-decimal pl-4">
          <li>
            Crie a conta e ative o faturamento <strong className="text-foreground">diretamente no provedor</strong>:{' '}
            <a href={provider.links.buyCredits} target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline inline-flex items-center gap-1">
              comprar créditos / faturamento <ExternalLink className="h-3 w-3" />
            </a>
            . {provider.billingNote}
          </li>
          <li>
            Gere uma chave de API:{' '}
            <a href={provider.links.createKey} target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline inline-flex items-center gap-1">
              criar chave <ExternalLink className="h-3 w-3" />
            </a>
            . Recomendamos definir limite de gastos e deixar a recarga automática desligada.
          </li>
          <li>Cole a chave abaixo. Nunca envie a chave por WhatsApp, e-mail ou chat.</li>
        </ol>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Chave de API</label>
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider?.keyHint ?? ''}
          className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Modelo (opcional)</label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={`Em branco: escolhemos um disponível na sua conta (ex.: ${provider?.preferredModels[0] ?? ''})`}
          className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>

      <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
        Ao conectar, fazemos uma chamada mínima de teste com a sua chave (custo de poucos tokens, cobrado pelo provedor) para confirmar autenticação, modelo e faturamento.
      </p>

      {error && <p className="text-xs text-neural-danger">{error}</p>}

      <div className="flex gap-2">
        <button disabled={busy || apiKey.trim().length < 16} onClick={submit} className="btn-primary rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Validar e conectar
        </button>
        <button onClick={onCancel} className="btn-ghost rounded-lg px-4 py-2.5 text-sm border border-border">Cancelar</button>
      </div>
    </div>
  );
}

/* ── Página ── */
export default function AIConfigPage() {
  const { tenantId } = useAuth();
  const [connections, setConnections] = useState<AiConnection[]>([]);
  const [providers, setProviders] = useState<AiProviderInfo[]>([]);
  const [plan, setPlan] = useState<TenantPlanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [c, p, s] = await Promise.all([
        aiConnectionsApi.list(tenantId),
        aiConnectionsApi.providers(tenantId),
        plansApi.summary(tenantId),
      ]);
      setConnections(c.data);
      setProviders(p.data);
      setPlan(s.data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível carregar as conexões de IA.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  const limit = plan?.plan.limits.aiConnections ?? 0;
  const canAdd = connections.length < limit;

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/configuracoes" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Configurações de IA</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Conecte a chave de API da sua própria conta no provedor de IA.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="text-sm font-semibold text-foreground">Nenhum plano inclui créditos ou tokens de IA</p>
          <p>
            Você contrata e paga o consumo diretamente ao provedor escolhido (Claude, OpenAI, Gemini ou OpenRouter).
            A Walletz não compra, revende nem cobra tokens. A chave fica criptografada (AES-256-GCM), separada por empresa,
            e nunca é exibida de novo após salva.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Conexões no plano</span>
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-display font-semibold text-primary">{connections.length} / {limit || '—'}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Tokens no mês</span>
            <Activity className="h-4 w-4 text-neural-blue" />
          </div>
          <p className="text-xl font-display font-semibold text-neural-blue">{(plan?.aiTokensMonth ?? 0).toLocaleString('pt-BR')}</p>
        </div>
        <div className="stat-card col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Custo da IA</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Consulte saldo e fatura no painel do seu provedor.</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-neural-danger/40 bg-neural-danger/5 p-3 text-sm text-neural-danger">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : (
        <div className="space-y-3">
          {connections.length === 0 && !adding && (
            <div className="neural-card p-6 text-center space-y-2">
              <AlertTriangle className="h-6 w-6 text-neural-warning mx-auto" />
              <p className="text-sm font-semibold text-foreground">Seus agentes ainda não têm IA conectada</p>
              <p className="text-xs text-muted-foreground">Sem uma chave sua, o laboratório, o webchat e o WhatsApp não geram respostas automáticas.</p>
            </div>
          )}

          {connections.map((c) => (
            <ConnectionCard
              key={c.id}
              tenantId={tenantId!}
              connection={c}
              provider={providers.find((p) => p.id === c.provider)}
              onChanged={load}
            />
          ))}

          {adding && tenantId ? (
            <NewConnection tenantId={tenantId} providers={providers} onCreated={() => { setAdding(false); void load(); }} onCancel={() => setAdding(false)} />
          ) : canAdd ? (
            <button onClick={() => setAdding(true)} className="btn-primary rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Conectar provedor de IA
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Seu plano {plan?.plan.name} permite {limit} {limit === 1 ? 'conexão' : 'conexões'} de IA. Para conectar outro provedor, fale com a Walletz sobre mudar de plano.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
