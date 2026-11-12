'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import {
  adminApi, apiErrorMessage, fmtAgo, fmtDate, fmtInt, type AdminUserRow, type Paginated,
} from '../../../../lib/admin-api';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, Pagination } from '../../_components/admin-ui';

export default function AdminUsuariosPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminUserRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminApi.users({ page, pageSize: 50 });
      setData(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Usuários"
        subtitle={data ? `${fmtInt(data.total)} usuário(s) cadastrados` : 'Usuários da plataforma'}
      />
      {error ? <ErrorBlock message={error} onRetry={load} /> : loading && !data ? <LoadingBlock /> : !data || data.items.length === 0 ? (
        <EmptyState text="Nenhum usuário." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-3 py-3 font-medium">Organizações</th>
                <th className="px-3 py-3 font-medium">E-mail verificado</th>
                <th className="px-3 py-3 font-medium">Último login</th>
                <th className="px-3 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-1.5 font-medium">
                      {u.name ?? u.email}
                      {u.isPlatformAdmin && <ShieldCheck className="h-3.5 w-3.5 text-neural-danger" aria-label="Admin da plataforma" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {u.memberships.length === 0 ? <span className="text-muted-foreground">—</span> : u.memberships.map((m) => (
                      <Link key={m.tenantId} href={`/admin/clientes/${m.tenantId}`} className="mr-2 hover:text-primary">
                        {m.tenantName} <span className="text-muted-foreground">({m.role})</span>
                      </Link>
                    ))}
                  </td>
                  <td className="px-3 py-3 text-xs">{u.emailVerified ? 'sim' : <span className="text-muted-foreground">não</span>}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{fmtAgo(u.lastLoginAt)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
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
