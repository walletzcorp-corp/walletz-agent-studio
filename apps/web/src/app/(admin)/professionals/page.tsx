import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Plus, UserCheck } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  email?: string;
  cpf?: string;
  councilType?: string;
  councilNumber?: string;
  councilUf?: string;
  specialties: { specialty: { name: string } }[];
  unitLinks: { status: string }[];
}

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: { page?: string; organizationId?: string };
}) {
  const token = await getToken();
  const page = searchParams.page ?? '1';

  let data: { items: Professional[]; total: number; totalPages: number } = { items: [], total: 0, totalPages: 1 };
  let error = '';

  try {
    const qs = new URLSearchParams({ page, limit: '20' });
    if (searchParams.organizationId) qs.set('organizationId', searchParams.organizationId);
    data = await api.get(`/professionals?${qs}`, token);
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Profissionais</h1>
          <p className="text-slate-500 text-sm mt-1">{data.total} registros</p>
        </div>
        <Link href="/professionals/new" className="btn-primary">
          <Plus size={16} /> Novo Profissional
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted border-b border-surface-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Conselho</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Especialidades</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Vínculos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <UserCheck size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400">Nenhum profissional cadastrado.</p>
                </td>
              </tr>
            )}
            {data.items.map((p) => (
              <tr key={p.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  {p.email && <p className="text-slate-400 text-xs">{p.email}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {p.councilType && p.councilNumber
                    ? `${p.councilType} ${p.councilNumber}/${p.councilUf ?? ''}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.specialties?.length > 0
                      ? p.specialties.map((s, i) => (
                          <span key={i} className="badge badge-blue">{s.specialty.name}</span>
                        ))
                      : <span className="text-slate-400 text-xs">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {p.unitLinks?.filter((l) => l.status === 'VIGENTE').length ?? 0} ativo(s)
                </td>
                <td className="px-4 py-3">
                  <Link href={`/professionals/${p.id}`} className="text-brand-emerald text-xs hover:underline">
                    Ver →
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
              href={`?page=${p}${searchParams.organizationId ? `&organizationId=${searchParams.organizationId}` : ''}`}
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
