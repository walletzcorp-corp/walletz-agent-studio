'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Cpu, ArrowDownToLine, ArrowUpFromLine, MessageSquare } from 'lucide-react';
import {
  adminApi, apiErrorMessage, fmtAgo, fmtCompact, fmtInt,
  type AdminLlmStatus, type AdminOverview, type AdminTenantRow,
} from '../../../../lib/admin-api';
import { DailyBars, ErrorBlock, KpiCard, LoadingBlock, PageHeader, Section, UsageMeter } from '../../_components/admin-ui';

const STATUS: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativa', className: 'badge-success' },
  billing_error: { label: 'Sem crédito', className: 'badge-warning' },
  invalid: { label: 'Chave recusada', className: 'badge-danger' },
  revoked: { label: 'Revogada', className: 'badge-danger' },
};

const PROVIDER_NAMES: Record<string, string> = {
  anthropic: 'Claude', openai: 'OpenAI', gemini: 'Gemini', openrouter: 'OpenRouter',
};

export default function AdminIaPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [status, setStatus] = useState<AdminLlmStatus | null>(null);
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, s, t] = await Promise.all([adminApi.overview(), adminApi.llm(), adminApi.tenants({ pageSize: 100 })]);
      setOverview(o.data);
      setStatus(s.data);
      setTenants([...t.data.items].sort((a, b) => b.tokensMonth - a.tokensMonth));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !overview) return <div className="page-container"><LoadingBlock /></div>;
  if (error || !overview || !status) return <div className="page-container"><ErrorBlock message={error ?? 'Sem dados'} onRetry={load} /></div>;

  const { llm } = overview;

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="IA dos clientes"
        subtitle={`Cada cliente usa a própria chave (BYOK) e paga o provedor diretamente · mês desde ${new Date(llm.monthStart).toLocaleDateString('pt-BR')}`}
        right={
          <button onClick={() => void load()} className="btn-ghost flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Tokens de entrada (mês)" value={fmtCompact(llm.inputTokensMonth)} icon={ArrowDownToLine} />
        <KpiCard label="Tokens de saída (mês)" value={fmtCompact(llm.outputTokensMonth)} icon={ArrowUpFromLine} />
        <KpiCard label="Respostas geradas (mês)" value={fmtInt(llm.callsMonth)} icon={MessageSquare} />
        <KpiCard label="Clientes sem chave" value={fmtInt(status.tenantsWithoutKey.length)} icon={Cpu} color="text-neural-warning" />
      </div>

      <Section title="Conexões de IA dos clientes">
        {status.connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente conectou chave de IA ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Cliente</th>
                  <th className="py-2 pr-3 font-medium">Provedor · modelo</th>
                  <th className="py-2 pr-3 font-medium">Chave</th>
                  <th className="py-2 pr-3 font-medium">Situação</th>
                  <th className="py-2 font-medium">Última validação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {status.connections.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3"><Link href={`/admin/clientes/${c.tenantId}`} className="hover:text-primary">{c.tenantName}</Link></td>
                    <td className="py-2 pr-3">{PROVIDER_NAMES[c.provider] ?? c.provider} · <span className="text-muted-foreground">{c.model}</span>{c.isDefault ? ' · padrão' : ''}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{c.maskedKey}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS[c.status]?.className ?? ''}`} title={c.lastError ?? undefined}>{STATUS[c.status]?.label ?? c.status}</span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{c.lastValidatedAt ? fmtAgo(c.lastValidatedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">A Walletz nunca vê as chaves completas. Problemas de crédito são resolvidos pelo cliente no provedor; o suporte orienta o diagnóstico.</p>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Clientes sem chave de IA">
          {status.tenantsWithoutKey.length === 0 ? <p className="text-sm text-muted-foreground">Todos os clientes têm chave conectada.</p> : (
            <ul className="divide-y divide-border/60 text-sm">
              {status.tenantsWithoutKey.slice(0, 30).map((t) => (
                <li key={t.id} className="py-2"><Link href={`/admin/clientes/${t.id}`} className="hover:text-primary">{t.name}</Link></li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Consumo diário (30 dias)">
          <DailyBars data={overview.daily} valueKey="tokens" label="tokens" />
        </Section>
      </div>

      <Section title="Consumo técnico e limite opcional por cliente (mês)">
        {tenants.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma organização.</p> : (
          <ul className="divide-y divide-border/60">
            {tenants.map((t) => (
              <li key={t.id} className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[1fr_2fr] md:items-center">
                <Link href={`/admin/clientes/${t.id}`} className="text-sm font-medium hover:text-primary">{t.name}</Link>
                <UsageMeter used={t.tokensMonth} limit={t.tokenLimit} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">O limite de tokens é uma trava de segurança opcional; o limite de gasto real é o que o cliente define no provedor.</p>
      </Section>
    </div>
  );
}
