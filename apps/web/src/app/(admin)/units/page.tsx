import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function UnitsPage({ searchParams }: { searchParams: { page?: string; organizationId?: string; status?: string } }) {
  const token = await getToken();

  const page = searchParams.page ?? '1';
  let data: any = { items: [], total: 0, totalPages: 1 };
  let error = '';

  try {
    const qs = new URLSearchParams({ page, limit: '20' });
    if (searchParams.organizationId) qs.set('organizationId', searchParams.organizationId);
    if (searchParams.status) qs.set('status', searchParams.status);
    data = await api.get(`/units?${qs}`, token);
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Unidades</h1>
          <p className="text-slate-500 text-sm mt-1">{data.total} registros</p>
        </div>
        <Link href="/units/new" className="btn-primary">
          <Plus size={16} /> Nova Unidade
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted border-b border-surface-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Cidade / UF</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Checklist</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma unidade encontrada.</td></tr>
            )}
            {data.items.map((u: any) => (
              <tr key={u.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3 font-mono text-slate-600">{u.code}</td>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.cidade} / {u.uf}</td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${u.checklistCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
                    {u.checklistCompleted ? '✓ Completo' : '⚠ Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/units/${u.id}`} className="text-brand-emerald text-xs hover:underline">Detalhes →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
