import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { api } from '@/lib/api';

export default async function AuditPage({ searchParams }: { searchParams: { page?: string; action?: string; result?: string } }) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;
  let data: any = { items: [], total: 0 };
  let error = '';
  try {
    const qs = new URLSearchParams({ page: searchParams.page ?? '1', limit: '50' });
    if (searchParams.action) qs.set('action', searchParams.action);
    if (searchParams.result) qs.set('result', searchParams.result);
    data = await api.get(`/audit?${qs}`, token);
  } catch (e: any) { error = e.message; }

  const resultBadge = (r: string) => {
    if (r === 'SUCCESS') return <span className="badge badge-green">{r}</span>;
    if (r === 'DENIED') return <span className="badge badge-yellow">{r}</span>;
    return <span className="badge badge-red">{r}</span>;
  };

  return (
    <div>
      <div className="mb-6">
        <h1>Auditoria</h1>
        <p className="text-slate-500 text-sm mt-1">{data.total} eventos registrados</p>
      </div>

      <form method="GET" className="flex gap-3 mb-6">
        <input name="action" defaultValue={searchParams.action} placeholder="Filtrar por ação..." className="input max-w-xs" />
        <select name="result" defaultValue={searchParams.result} className="input max-w-[160px]">
          <option value="">Todos</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
          <option value="DENIED">DENIED</option>
        </select>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted border-b border-surface-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Data / Hora</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Ação</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Recurso</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Ator</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum evento encontrado.</td></tr>
            )}
            {data.items.map((ev: any) => (
              <tr key={ev.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                  {new Date(ev.occurredAt).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{ev.action}</td>
                <td className="px-4 py-3 text-slate-600">{ev.resource}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{ev.actorEmail ?? ev.actorId ?? '—'}</td>
                <td className="px-4 py-3">{resultBadge(ev.result)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
