import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  dataNasc?: string;
  sexo?: string;
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; organizationId?: string };
}) {
  const token = await getToken();
  const page = searchParams.page ?? '1';

  let data: { data: Patient[]; total: number; totalPages: number } = { data: [], total: 0, totalPages: 1 };
  let error = '';

  try {
    const qs = new URLSearchParams({ page, limit: '20' });
    if (searchParams.search) qs.set('search', searchParams.search);
    if (searchParams.organizationId) qs.set('organizationId', searchParams.organizationId);
    const raw: any = await api.get(`/patients?${qs}`, token);
    // API returns {data, total, page, limit, totalPages}
    data = raw;
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Pacientes</h1>
          <p className="text-slate-500 text-sm mt-1">{data.total} registros</p>
        </div>
        <Link href="/patients/new" className="btn-primary">
          <Plus size={16} /> Novo Paciente
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <form className="mb-4">
        <div className="flex gap-2">
          <input
            name="search"
            defaultValue={searchParams.search}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="input flex-1"
          />
          <button type="submit" className="btn-secondary">Buscar</button>
        </div>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-surface-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">CPF</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Data Nasc.</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  Nenhum paciente cadastrado
                </td>
              </tr>
            ) : (
              data.data.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.cpf ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.telefone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.dataNasc ? new Date(p.dataNasc).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/patients/${p.id}`} className="text-brand-emerald hover:underline text-xs">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>Página {page} de {data.totalPages}</span>
          <div className="flex gap-2">
            {+page > 1 && (
              <Link href={`?page=${+page - 1}${searchParams.search ? `&search=${searchParams.search}` : ''}`} className="btn-secondary py-1">
                Anterior
              </Link>
            )}
            {+page < data.totalPages && (
              <Link href={`?page=${+page + 1}${searchParams.search ? `&search=${searchParams.search}` : ''}`} className="btn-secondary py-1">
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
