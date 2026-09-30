import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default async function UsersPage({ searchParams }: { searchParams: { page?: string } }) {
  const token = await getToken();
  let data: any = { items: [], total: 0 };
  let error = '';
  try {
    data = await api.get(`/users?page=${searchParams.page ?? 1}`, token);
  } catch (e: any) { error = e.message; }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Usuários</h1>
          <p className="text-slate-500 text-sm mt-1">{data.total} registros</p>
        </div>
        <Link href="/users/invite" className="btn-primary">
          <UserPlus size={16} /> Convidar Usuário
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted border-b border-surface-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">E-mail</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Desde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
            )}
            {data.items.map((u: any) => (
              <tr key={u.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
