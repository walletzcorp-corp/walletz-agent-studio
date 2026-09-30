import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface Organization {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email?: string;
  status: string;
  createdAt: string;
  _count: { units: number };
}

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; status?: string };
}) {
  const token = await getToken();

  const page = searchParams.page ?? '1';
  const search = searchParams.search ?? '';
  const status = searchParams.status ?? '';

  let data: { items: Organization[]; total: number; totalPages: number } = {
    items: [],
    total: 0,
    totalPages: 1,
  };
  let error = '';

  try {
    const qs = new URLSearchParams({ page, limit: '20' });
    if (search) qs.set('search', search);
    if (status) qs.set('status', status);
    data = await api.get(`/organizations?${qs}`, token);
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Organizações</h1>
          <p className="text-slate-500 text-sm mt-1">{data.total} registros</p>
        </div>
        <Link href="/organizations/new" className="btn-primary">
          <Plus size={16} />
          Nova Organização
        </Link>
      </div>

      <form method="GET" className="flex gap-3 mb-6">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por nome ou CNPJ..."
          className="input max-w-xs"
        />
        <select name="status" defaultValue={status} className="input max-w-[180px]">
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="EM_VALIDACAO">Em validação</option>
          <option value="ATIVA">Ativa</option>
          <option value="SUSPENSA">Suspensa</option>
          <option value="ENCERRADA">Encerrada</option>
        </select>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted border-b border-surface-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome Fantasia</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">CNPJ</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Unidades</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma organização encontrada.
                </td>
              </tr>
            )}
            {data.items.map((org) => (
              <tr key={org.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{org.nomeFantasia}</p>
                  <p className="text-slate-400 text-xs">{org.razaoSocial}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {org.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={org.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{org._count.units}</td>
                <td className="px-4 py-3">
                  <Link href={`/organizations/${org.id}`} className="text-brand-emerald text-xs hover:underline">
                    Ver detalhes →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-4">
          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?page=${p}${search ? `&search=${search}` : ''}${status ? `&status=${status}` : ''}`}
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
