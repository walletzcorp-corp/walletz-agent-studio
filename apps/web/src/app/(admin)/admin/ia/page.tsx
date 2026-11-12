'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import {
  adminApi, apiErrorMessage, fmtAgo, fmtCompact, fmtInt, type AdminOverview, type AdminTenantRow,
} from '../../../../lib/admin-api';
import { DailyBars, ErrorBlock, KpiCard, LoadingBlock, PageHeader, Section, UsageMeter } from '../../_components/admin-ui';
import { RateLimitTable } from './rate-limits';
import { Cpu, ArrowDownToLine, ArrowUpFromLine, MessageSquare } from 'lucide-react';

export default function AdminIaPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, t] = await Promise.all([adminApi.overview(), adminApi.tenants({ pageSize: 100 })]);
      setOverview(o.data);
      setTenants([...t.data.items].sort((a, b) => b.tokensMonth - a.tokensMonth));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !overview) return <div className="page-container"><LoadingBlock /></div>;
  if (error || !overview) return <div className="page-container"><ErrorBlock message={error ?? 'Sem dados'} onRetry={load} /></div>;

  const { llm } = overview;

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="IA (Claude)"
        subtitle={`Modelo em uso: ${llm.model} · mês desde ${new Date(llm.monthStart).toLocaleDateString('pt-BR')}`}
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
        <KpiCard label="Tokens hoje" value={fmtCompact(llm.tokensToday)} icon={Cpu} color="text-neural-success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Limites da conta Anthropic (por minuto)">
          <RateLimitTable snapshot={llm.rateLimits} />
          <p className="mt-3 text-[11px] text-muted-foreground">
            Limites de taxa da organização na Anthropic, compartilhados por todos os clientes. O limite de gasto mensal é definido no console da Anthropic.
            {llm.rateLimits && <> Última leitura {fmtAgo(llm.rateLimits.capturedAt)}.</>}
          </p>
        </Section>
        <Section title="Consumo diário (30 dias)">
          <DailyBars data={overview.daily} valueKey="tokens" label="tokens" />
        </Section>
      </div>

      <Section title="Consumo e limite por cliente (mês)">
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
        <p className="mt-2 text-[11px] text-muted-foreground">Para definir ou remover o limite de um cliente, abra o cliente e use “Limite de tokens”.</p>
      </Section>
    </div>
  );
}
