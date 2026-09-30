import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function OrganizationDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;

  let org: any = null;
  try {
    org = await api.get(`/organizations/${params.id}`, token);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <Link href="/organizations" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-emerald mb-6">
        <ArrowLeft size={14} /> Voltar para Organizações
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1>{org.nomeFantasia}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{org.razaoSocial}</p>
        </div>
        <StatusBadge status={org.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="mb-3">Dados Cadastrais</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-slate-500">CNPJ</dt>
              <dd>{org.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">E-mail</dt>
              <dd>{org.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Telefone</dt>
              <dd>{org.telefone ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Timezone</dt>
              <dd>{org.timezone}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h3 className="mb-3">Resumo</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-slate-500">Unidades</dt>
              <dd>{org._count?.units ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Usuários</dt>
              <dd>{org._count?.users ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Profissionais</dt>
              <dd>{org._count?.professionals ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tenant ID</dt>
              <dd className="font-mono text-xs text-slate-400">{org.tenant?.id?.slice(0, 8)}…</dd>
            </div>
          </dl>
        </div>
      </div>

      {org.statusHistory?.length > 0 && (
        <div className="card">
          <h3 className="mb-3">Histórico de Status</h3>
          <ul className="text-sm space-y-2">
            {org.statusHistory.map((h: any) => (
              <li key={h.id} className="flex items-center gap-2 text-slate-600">
                <span>{h.fromStatus}</span>
                <span className="text-slate-400">→</span>
                <span>{h.toStatus}</span>
                {h.reason && <span className="text-slate-400">— {h.reason}</span>}
                <span className="ml-auto text-slate-400 text-xs">
                  {new Date(h.changedAt).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Link href={`/organizations/${params.id}/edit`} className="btn-secondary">
          Editar
        </Link>
        <Link href={`/units?organizationId=${params.id}`} className="btn-secondary">
          Ver Unidades
        </Link>
      </div>
    </div>
  );
}
