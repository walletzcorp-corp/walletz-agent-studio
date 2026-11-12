'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { cn } from '@walletz/ui';
import {
  adminApi, apiErrorMessage, fmtAgo, fmtDate, fmtInt, templateLabel,
  type AdminTenantRow, type Paginated,
} from '../../../../lib/admin-api';
import {
  EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination, TenantStatusBadge, UsageMeter,
} from '../../_components/admin-ui';

const FILTERS = [
  { id: '', label: 'Todos' },
  { id: 'trial', label: 'Trial' },
  { id: 'active', label: 'Ativos' },
  { id: 'suspended', label: 'Suspensos' },
  { id: 'cancelled', label: 'Cancelados' },
];

export default function AdminClientesPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminTenantRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.tenants({ status, search: query, page, pageSize: 25 });
      setData(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, query, page]);

  useEffect(() => { void load(); }, [load]);

  // Busca com pequeno atraso para não consultar a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setQuery(search.trim()); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Clientes"
        subtitle={data ? `${fmtInt(data.total)} organização(ões) encontrada(s)` : 'Organizações cadastradas na plataforma'}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, slug ou e-mail"
            className="w-full rounded-lg border border-border bg-surface-1 py-2 pl-9 pr-3 text-sm focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setStatus(f.id); setPage(1); }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                status === f.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={load} />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : !data || data.items.length === 0 ? (
        <EmptyState text="Nenhuma organização encontrada." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Organização</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium text-right">Membros</th>
                <th className="px-3 py-3 font-medium text-right">Agentes</th>
                <th className="px-3 py-3 font-medium">Tipo preferido</th>
                <th className="px-3 py-3 font-medium min-w-[180px]">IA no mês</th>
                <th className="px-3 py-3 font-medium">Última atividade</th>
                <th className="px-3 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.items.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clientes/${t.id}`} className="font-medium text-foreground hover:text-primary">{t.name}</Link>
                    <p className="text-xs text-muted-foreground">{t.ownerEmail ?? t.slug}</p>
                  </td>
                  <td className="px-3 py-3">
                    <TenantStatusBadge status={t.status} />
                    {t.status === 'trial' && t.trialEndsAt && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">até {fmtDate(t.trialEndsAt)}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.members}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{t.agents}</td>
                  <td className="px-3 py-3 text-xs">{templateLabel(t.topTemplate)}</td>
                  <td className="px-3 py-3"><UsageMeter used={t.tokensMonth} limit={t.tokenLimit} /></td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{fmtAgo(t.lastActivityAt)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDate(t.createdAt)}</td>
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
