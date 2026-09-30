import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ProfessionalDetailPage({ params }: { params: { id: string } }) {
  const token = await getToken();

  let prof: any = null;
  try {
    prof = await api.get(`/professionals/${params.id}`, token);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <Link href="/professionals" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-emerald mb-6">
        <ArrowLeft size={14} /> Voltar para Profissionais
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1>{prof.name}</h1>
          {prof.email && <p className="text-slate-500 text-sm mt-0.5">{prof.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="mb-3">Dados do Profissional</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-slate-500">CPF</dt>
              <dd>{prof.cpf ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Telefone</dt>
              <dd>{prof.telefone ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Conselho</dt>
              <dd>
                {prof.councilType && prof.councilNumber
                  ? `${prof.councilType} ${prof.councilNumber}/${prof.councilUf ?? ''}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h3 className="mb-3">Especialidades</h3>
          {prof.specialties?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {prof.specialties.map((s: any) => (
                <span key={s.specialtyId} className="badge badge-blue">{s.specialty.name}</span>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Nenhuma especialidade vinculada.</p>
          )}
        </div>
      </div>

      {prof.unitLinks?.length > 0 && (
        <div className="card mb-4">
          <h3 className="mb-3">Vínculos com Unidades</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left py-2 font-medium text-slate-600">Unidade</th>
                <th className="text-left py-2 font-medium text-slate-600">Função</th>
                <th className="text-left py-2 font-medium text-slate-600">Status</th>
                <th className="text-left py-2 font-medium text-slate-600">Início</th>
              </tr>
            </thead>
            <tbody>
              {prof.unitLinks.map((l: any) => (
                <tr key={l.id} className="border-b border-surface-border last:border-0">
                  <td className="py-2">{l.unit?.name ?? l.unitId}</td>
                  <td className="py-2 text-slate-600">{l.role ?? '—'}</td>
                  <td className="py-2">
                    <span className={`text-xs font-medium ${l.status === 'VIGENTE' ? 'text-green-600' : 'text-slate-400'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-400 text-xs">
                    {new Date(l.startDate).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {prof.credentials?.length > 0 && (
        <div className="card">
          <h3 className="mb-3">Credenciais</h3>
          <ul className="text-sm space-y-2">
            {prof.credentials.map((c: any) => (
              <li key={c.id} className="flex justify-between text-slate-600">
                <span>{c.type} — {c.number}</span>
                {c.expiresAt && (
                  <span className="text-slate-400 text-xs">
                    Vence: {new Date(c.expiresAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
