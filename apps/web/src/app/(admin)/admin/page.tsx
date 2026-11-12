'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Bot, Users, MessageSquare, Cpu, BookOpen, RefreshCw, Gauge,
} from 'lucide-react';
import {
  adminApi, apiErrorMessage, fmtAgo, fmtCompact, fmtInt, templateLabel, type AdminOverview,
} from '../../../lib/admin-api';
import {
  ActivityList, BarList, DailyBars, ErrorBlock, KpiCard, LoadingBlock, PageHeader, Section,
  TemplateChips, TenantStatusBadge, UsageMeter,
} from '../_components/admin-ui';
import { RateLimitTable } from './ia/rate-limits';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.overview();
      setData(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <div className="page-container"><LoadingBlock /></div>;
  if (error || !data) return <div className="page-container"><ErrorBlock message={error ?? 'Sem dados'} onRetry={load} /></div>;

  const { tenants, users, agents, conversations, knowledge, llm } = data;
  const tokensMonth = llm.inputTokensMonth + llm.outputTokensMonth;

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Visão geral da plataforma"
        subtitle={`Atualizado ${fmtAgo(data.generatedAt)} · dados reais do banco`}
        right={
          <button onClick={() => void load()} className="btn-ghost flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        }
      />

      {/* Totais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Clientes (organizações)"
          value={fmtInt(tenants.total)}
          sub={`${fmtInt(tenants.byStatus['active'] ?? 0)} ativos · ${fmtInt(tenants.byStatus['trial'] ?? 0)} trial · ${fmtInt(tenants.byStatus['suspended'] ?? 0)} suspensos`}
          icon={Building2}
          color="text-primary"
        />
        <KpiCard
          label="Agentes criados"
          value={fmtInt(agents.total)}
          sub={`${fmtInt(agents.byStatus['published'] ?? 0)} publicados · ${fmtInt(agents.byStatus['draft'] ?? 0)} rascunho`}
          icon={Bot}
          color="text-neural-blue"
        />
        <KpiCard
          label="Usuários"
          value={fmtInt(users.total)}
          sub={`${fmtInt(users.new30d)} novos em 30d · ${fmtInt(users.active7d)} ativos em 7d`}
          icon={Users}
        />
        <KpiCard
          label="Conversas"
          value={fmtInt(conversations.total)}
          sub={`${fmtInt(conversations.messages30d)} mensagens em 30d`}
          icon={MessageSquare}
        />
        <KpiCard
          label="Tokens IA no mês"
          value={fmtCompact(tokensMonth)}
          sub={`${fmtInt(llm.callsMonth)} respostas · hoje ${fmtCompact(llm.tokensToday)}`}
          icon={Cpu}
          color="text-neural-success"
        />
        <KpiCard
          label="Base de conhecimento"
          value={fmtInt(knowledge.sources + knowledge.items)}
          sub={`${fmtInt(knowledge.sources)} arquivos · ${fmtInt(knowledge.items)} ensinamentos`}
          icon={BookOpen}
        />
      </div>

      {/* Séries */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Novos clientes (30 dias)">
          <DailyBars data={data.daily} valueKey="tenants" label="novos" />
        </Section>
        <Section title="Agentes criados (30 dias)">
          <DailyBars data={data.daily} valueKey="agents" label="criados" />
        </Section>
        <Section title="Tokens de IA (30 dias)">
          <DailyBars data={data.daily} valueKey="tokens" label="tokens" />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Preferência de tipo de agente */}
        <Section title="Tipos de agente mais escolhidos">
          <BarList
            emptyText="Nenhum agente criado ainda."
            items={agents.byTemplate.map((t) => ({
              key: t.template,
              label: templateLabel(t.template),
              value: t.agents,
              hint: `· ${t.tenants} cliente${t.tenants === 1 ? '' : 's'}`,
            }))}
          />
        </Section>

        {/* Claude */}
        <Section
          title={`Claude · ${llm.model}`}
          right={<Link href="/admin/ia" className="text-xs text-primary hover:underline">detalhes</Link>}
        >
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Entrada no mês</p>
              <p className="font-semibold tabular-nums">{fmtCompact(llm.inputTokensMonth)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saída no mês</p>
              <p className="font-semibold tabular-nums">{fmtCompact(llm.outputTokensMonth)}</p>
            </div>
          </div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" /> Limites da conta Anthropic (por minuto)
          </p>
          <RateLimitTable snapshot={llm.rateLimits} />
        </Section>
      </div>

      {/* Agentes por organização + preferência de cada cliente */}
      <Section
        title="Agentes por organização"
        right={<Link href="/admin/clientes" className="text-xs text-primary hover:underline">todos os clientes</Link>}
      >
        {data.agentsPerTenant.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma organização cadastrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Organização</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium text-right">Agentes</th>
                  <th className="py-2 font-medium">Tipos escolhidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.agentsPerTenant.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-3">
                      <Link href={`/admin/clientes/${t.id}`} className="font-medium text-foreground hover:text-primary">{t.name}</Link>
                    </td>
                    <td className="py-2 pr-3"><TenantStatusBadge status={t.status} /></td>
                    <td className="py-2 pr-3 text-right tabular-nums">{t.agents}</td>
                    <td className="py-2"><TemplateChips byTemplate={t.byTemplate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Maior consumo de IA no mês">
          {llm.topTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum consumo registrado neste mês.</p>
          ) : (
            <ul className="space-y-3">
              {llm.topTenants.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/clientes/${t.id}`} className="text-sm font-medium hover:text-primary">{t.name}</Link>
                  <UsageMeter used={t.tokens} limit={t.limit} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Atividade recente"
          right={<Link href="/admin/atividade" className="text-xs text-primary hover:underline">ver tudo</Link>}
        >
          <ActivityList items={data.recentActivity} />
        </Section>
      </div>
    </div>
  );
}
