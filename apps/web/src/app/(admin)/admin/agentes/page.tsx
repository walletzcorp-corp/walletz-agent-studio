'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@walletz/ui';
import {
  AGENT_STATUS, TEMPLATE_LABELS, adminApi, apiErrorMessage, fmtCompact, fmtDate, fmtInt, templateLabel,
  type AdminAgentRow, type Paginated,
} from '../../../../lib/admin-api';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination } from '../../_components/admin-ui';

export default function AdminAgentesPage() {
  const [template, setTemplate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminAgentRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.agents({ template, page, pageSize: 50 });
      setData(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [template, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Agentes"
        subtitle={data ? `${fmtInt(data.total)} agente(s) em todas as organizações` : 'Agentes de todas as organizações'}
      />

      <select
        value={template}
        onChange={(e) => { setTemplate(e.target.value); setPage(1); }}
        className="rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm"
        aria-label="Filtrar por tipo de agente"
      >
        <option value="">Todos os tipos</option>
        {Object.entries(TEMPLATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      {error ? <ErrorBlock message={error} onRetry={load} /> : loading && !data ? <LoadingBlock /> : !data || data.items.length === 0 ? (
        <EmptyState text="Nenhum agente encontrado." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Agente</th>
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Organização</th>
                <th className="px-3 py-3 font-medium">Criado por</th>
                <th className="px-3 py-3 font-medium text-right">Tokens no mês</th>
                <th className="px-3 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-3 py-3">{templateLabel(a.template)}</td>
                  <td className={cn('px-3 py-3 text-xs', a.status === 'published' ? 'text-neural-success' : 'text-muted-foreground')}>
                    {AGENT_STATUS[a.status] ?? a.status}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/clientes/${a.tenantId}`} className="hover:text-primary">{a.tenantName}</Link>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{a.createdBy ?? '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtCompact(a.tokensMonth)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  );
}
