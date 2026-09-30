import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  consultorio: 'Consultório',
  sala_procedimento: 'Sala de Procedimento',
  poltrona: 'Poltrona',
  maca: 'Maca',
  equipamento: 'Equipamento',
};

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: { page?: string; unitId?: string; type?: string; status?: string };
}) {
  const token = await getToken();
  const page = searchParams.page ?? '1';

  let data: any = { items: [], total: 0, totalPages: 1 };
  let error = '';

  try {
    const qs = new URLSearchParams({ page, limit: '20' });
    if (searchParams.unitId) qs.set('unitId', searchParams.unitId);
    if (searchParams.type) qs.set('type', searchParams.type);
    if (searchParams.status) qs.set('status', searchParams.status);
    data = await api.get(`/resources?${qs}`, token);
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Salas e Recursos</h1>
          <p className="text-slate-500 text-sm mt-1">{data.total} registros</p>
        </div>
        <Link href="/resources/new" className="btn-primary">
          <Plus size={16} /> Novo Recurso
        </Link>
      </div>

      <form method="GET" className="flex gap-3 mb-6 flex-wrap">
        <select name="type" defaultValue={searchParams.type ?? ''} className="input max-w-[200px]">
          <option value="">Todos os tipos</option>
          {Object.entries(RESOURCE_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select name="status" defaultValue={searchParams.status ?? ''} className="input max-w-[160px]">
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="ATIVO">Ativo</option>
          <option value="BLOQUEADO">Bloqueado</option>
          <option value="INATIVO">Inativo</option>
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
              <th className="text-left px-4 py-3 font-medium text-slate-600">Localização</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Capacidade</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Package size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400">Nenhum recurso cadastrado.</p>
                </td>
              </tr>
            )}
            {data.items.map((r: any) => (
              <tr key={r.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3 font-mono text-slate-600 text-xs">{r.code}</td>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {RESOURCE_TYPE_LABELS[r.type] ?? r.type}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {[r.floor && `Andar ${r.floor}`, r.location].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.capacity ?? 1}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
