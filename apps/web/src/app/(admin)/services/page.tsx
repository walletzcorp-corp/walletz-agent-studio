import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { Plus, Stethoscope } from 'lucide-react';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  consulta: 'Consulta',
  procedimento: 'Procedimento',
  exame: 'Exame',
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: { page?: string; organizationId?: string; type?: string; status?: string };
}) {
  const token = await getToken();
  const page = searchParams.page ?? '1';

  let data: any = { items: [], total: 0, totalPages: 1 };
  let error = '';

  try {
    const qs = new URLSearchParams({ page, limit: '20' });
    if (searchParams.organizationId) qs.set('organizationId', searchParams.organizationId);
    if (searchParams.type) qs.set('type', searchParams.type);
    if (searchParams.status) qs.set('status', searchParams.status);
    data = await api.get(`/services?${qs}`, token);
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Catálogo de Serviços</h1>
          <p className="text-slate-500 text-sm mt-1">{data.total} registros</p>
        </div>
        <Link href="/services/new" className="btn-primary">
          <Plus size={16} /> Novo Serviço
        </Link>
      </div>

      <form method="GET" className="flex gap-3 mb-6 flex-wrap">
        <select name="type" defaultValue={searchParams.type ?? ''} className="input max-w-[180px]">
          <option value="">Todos os tipos</option>
          {Object.entries(SERVICE_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select name="status" defaultValue={searchParams.status ?? ''} className="input max-w-[160px]">
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="PUBLICADO">Publicado</option>
          <option value="DESCONTINUADO">Descontinuado</option>
        </select>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted border-b border-surface-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Especialidade</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Duração</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Preço</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Stethoscope size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400">Nenhum serviço cadastrado.</p>
                </td>
              </tr>
            )}
            {data.items.map((s: any) => {
              const price = s.prices?.[0];
              return (
                <tr key={s.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{s.code}</td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{SERVICE_TYPE_LABELS[s.type] ?? s.type}</td>
                  <td className="px-4 py-3 text-slate-600">{s.specialty?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.durationMin} min</td>
                  <td className="px-4 py-3 text-slate-600">
                    {price
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: price.currency }).format(Number(price.amount))
                      : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/services/${s.id}`} className="text-brand-emerald text-xs hover:underline">Ver →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-4">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?page=${p}${searchParams.type ? `&type=${searchParams.type}` : ''}${searchParams.status ? `&status=${searchParams.status}` : ''}`}
              className={`px-3 py-1 rounded text-sm border ${
                String(p) === page
                  ? 'bg-brand-emerald text-white border-brand-emerald'
                  : 'border-surface-border text-slate-600 hover:bg-surface-muted'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
