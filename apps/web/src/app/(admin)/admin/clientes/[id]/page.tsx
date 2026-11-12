'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft, Ban, PlayCircle, CalendarPlus, Gauge, Loader2, CheckCircle2,
} from 'lucide-react';
import { cn } from '@walletz/ui';
import {
  AGENT_STATUS, adminApi, apiErrorMessage, fmtAgo, fmtCompact, fmtDate, fmtInt, templateLabel,
  type AdminTenantDetail,
} from '../../../../../lib/admin-api';
import {
  ActivityList, BarList, DailyBars, EmptyState, ErrorBlock, LoadingBlock, PageHeader, Section,
  TenantStatusBadge, UsageMeter,
} from '../../../_components/admin-ui';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dono', admin: 'Admin', manager: 'Gestor', agent_operator: 'Operador', analyst: 'Analista', viewer: 'Leitor',
};

const LIMIT_PRESETS = [100_000, 500_000, 1_000_000, 5_000_000];

export default function AdminClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<AdminTenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.tenant(id);
      setData(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <div className="page-container"><LoadingBlock /></div>;
  if (error || !data) return <div className="page-container"><ErrorBlock message={error ?? 'Sem dados'} onRetry={load} /></div>;

  const { tenant, llm, counts } = data;
  const tokensDaily = llm.daily.map((d) => ({ day: d.day, tokens: d.input + d.output }));

  return (
    <div className="page-container space-y-5">
      <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Clientes
      </Link>

      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.slug} · criado em ${fmtDate(tenant.createdAt)} · ${tenant.timezone}`}
        right={<TenantStatusBadge status={tenant.status} />}
      />

      <AdminActions detail={data} onDone={load} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
          ['Membros', data.members.length],
          ['Agentes', data.agents.length],
          ['Conversas', counts.conversations],
          ['Mensagens', counts.messages],
          ['Contatos', counts.contacts],
          ['Conhecimento', counts.knowledgeSources + counts.knowledgeItems],
          ['Integrações', counts.whatsappAccounts + counts.calendarConnections],
        ].map(([label, value]) => (
          <div key={String(label)} className="stat-card">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-display font-bold">{fmtInt(Number(value))}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="IA no mês (Claude)">
          <UsageMeter used={llm.tokensMonth} limit={llm.limit} />
          <div className="mt-4">
            <DailyBars data={tokensDaily} valueKey="tokens" label="tokens 30d" />
          </div>
        </Section>
        <Section title="Tipos de agente escolhidos">
          <BarList
            emptyText="Nenhum agente criado."
            items={Object.entries(data.agentsByTemplate)
              .sort((a, b) => b[1] - a[1])
              .map(([tpl, n]) => ({ key: tpl, label: templateLabel(tpl), value: n }))}
          />
        </Section>
        <Section title="Período">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><TenantStatusBadge status={tenant.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Trial até</dt><dd>{fmtDate(tenant.trialEndsAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Plano</dt><dd>{tenant.planId ?? 'sem plano'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">País / moeda</dt><dd>{tenant.country} / {tenant.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Atualizado</dt><dd>{fmtAgo(tenant.updatedAt)}</dd></div>
          </dl>
        </Section>
      </div>

      <Section title="Agentes">
        {data.agents.length === 0 ? <EmptyState text="Nenhum agente criado." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Nome</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium text-right">Tokens no mês</th>
                  <th className="py-2 font-medium">Criado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.agents.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 font-medium">{a.name}</td>
                    <td className="py-2 pr-3">{templateLabel(a.template)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{AGENT_STATUS[a.status] ?? a.status}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtCompact(a.tokensMonth)}</td>
                    <td className="py-2 text-muted-foreground">{fmtDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Membros">
          {data.members.length === 0 ? <EmptyState text="Sem membros." /> : (
            <ul className="divide-y divide-border/60">
              {data.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name ?? m.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p>{ROLE_LABELS[m.role] ?? m.role}{m.status !== 'active' ? ` · ${m.status}` : ''}</p>
                    <p className="text-muted-foreground">login {fmtAgo(m.lastLoginAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Atividade da organização">
          <ActivityList items={data.activity} showTenant={false} />
        </Section>
      </div>
    </div>
  );
}

/* ── Ações administrativas ─────────────────────────────────────────── */

type Panel = null | 'suspend' | 'trial' | 'limit';

function AdminActions({ detail, onDone }: { detail: AdminTenantDetail; onDone: () => Promise<void> }) {
  const { tenant, llm } = detail;
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(14);
  const [limitInput, setLimitInput] = useState(llm.limit === null ? '' : String(llm.limit));

  async function run(action: () => Promise<unknown>, okText: string) {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ ok: true, text: okText });
      setPanel(null);
      setReason('');
      await onDone();
    } catch (err) {
      setFeedback({ ok: false, text: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const parsedLimit = limitInput.trim() === '' ? null : Number(limitInput.replace(/\D/g, ''));
  const limitValid = parsedLimit === null || (Number.isInteger(parsedLimit) && parsedLimit >= 0);

  const btn = 'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50';

  return (
    <Section title="Ações">
      <div className="flex flex-wrap gap-2">
        {tenant.status === 'suspended' ? (
          <button
            disabled={busy}
            className={cn(btn, 'border-neural-success/40 text-neural-success hover:bg-neural-success/10')}
            onClick={() => void run(() => adminApi.reactivate(tenant.id), 'Organização reativada.')}
          >
            <PlayCircle className="h-3.5 w-3.5" /> Reativar
          </button>
        ) : tenant.status !== 'cancelled' ? (
          <button
            disabled={busy}
            className={cn(btn, panel === 'suspend' ? 'border-neural-danger bg-neural-danger/10 text-neural-danger' : 'border-neural-danger/40 text-neural-danger hover:bg-neural-danger/10')}
            onClick={() => setPanel(panel === 'suspend' ? null : 'suspend')}
          >
            <Ban className="h-3.5 w-3.5" /> Suspender
          </button>
        ) : null}
        <button
          disabled={busy}
          className={cn(btn, panel === 'trial' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-white/5')}
          onClick={() => setPanel(panel === 'trial' ? null : 'trial')}
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Estender trial
        </button>
        <button
          disabled={busy}
          className={cn(btn, panel === 'limit' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-white/5')}
          onClick={() => setPanel(panel === 'limit' ? null : 'limit')}
        >
          <Gauge className="h-3.5 w-3.5" /> Limite de tokens
        </button>
        {busy && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
      </div>

      {panel === 'suspend' && (
        <div className="mt-3 space-y-2 rounded-lg border border-neural-danger/30 bg-neural-danger/5 p-3">
          <p className="text-xs text-muted-foreground">
            Os usuários perdem o acesso à organização (agentes, conversas, laboratório). Nenhum dado é apagado; reativar devolve o acesso.
          </p>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da suspensão (obrigatório, fica na auditoria)"
            maxLength={500}
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm focus:outline-none"
          />
          <button
            disabled={busy || reason.trim().length < 3}
            className={cn(btn, 'border-neural-danger bg-neural-danger text-white hover:opacity-90')}
            onClick={() => void run(() => adminApi.suspend(tenant.id, reason.trim()), 'Organização suspensa.')}
          >
            Confirmar suspensão
          </button>
        </div>
      )}

      {panel === 'trial' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
          <span className="text-xs text-muted-foreground">
            Trial atual até {fmtDate(tenant.trialEndsAt)}. Adicionar:
          </span>
          {[7, 14, 30, 60].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn('rounded-full border px-3 py-1 text-xs', days === d ? 'border-primary text-primary' : 'border-border text-muted-foreground')}
            >
              {d} dias
            </button>
          ))}
          <button
            disabled={busy}
            className={cn(btn, 'border-primary bg-primary text-primary-foreground hover:opacity-90')}
            onClick={() => void run(() => adminApi.extendTrial(tenant.id, days), `Trial estendido em ${days} dias.`)}
          >
            Aplicar
          </button>
        </div>
      )}

      {panel === 'limit' && (
        <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Tokens de IA (entrada + saída) por mês. Ao atingir, o agente para de responder até o mês virar ou o limite subir. Uso atual: {fmtInt(llm.tokensMonth)}.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              inputMode="numeric"
              placeholder="vazio = sem limite"
              className="w-44 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm tabular-nums focus:outline-none"
            />
            {LIMIT_PRESETS.map((p) => (
              <button key={p} onClick={() => setLimitInput(String(p))} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
                {fmtCompact(p)}
              </button>
            ))}
            <button
              disabled={busy || !limitValid}
              className={cn(btn, 'border-primary bg-primary text-primary-foreground hover:opacity-90')}
              onClick={() => void run(
                () => adminApi.setTokenLimit(tenant.id, parsedLimit),
                parsedLimit === null ? 'Limite removido.' : `Limite definido em ${fmtInt(parsedLimit)} tokens/mês.`,
              )}
            >
              Salvar limite
            </button>
            {llm.limit !== null && (
              <button
                disabled={busy}
                className={cn(btn, 'border-border hover:bg-white/5')}
                onClick={() => void run(() => adminApi.setTokenLimit(tenant.id, null), 'Limite removido.')}
              >
                Remover limite
              </button>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <p className={cn('mt-3 flex items-center gap-1.5 text-xs', feedback.ok ? 'text-neural-success' : 'text-neural-danger')}>
          {feedback.ok && <CheckCircle2 className="h-3.5 w-3.5" />} {feedback.text}
        </p>
      )}
    </Section>
  );
}
