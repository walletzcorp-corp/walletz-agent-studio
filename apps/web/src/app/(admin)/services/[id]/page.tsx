import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const token = await getToken();

  let service: any = null;
  try {
    service = await api.get(`/services/${params.id}`, token);
  } catch {
    notFound();
  }

  const price = service.prices?.[0];

  return (
    <div className="max-w-3xl">
      <Link href="/services" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-emerald mb-6">
        <ArrowLeft size={14} /> Voltar para Serviços
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1>{service.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-mono">{service.code}</p>
        </div>
        <StatusBadge status={service.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="mb-3">Informações</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-slate-500">Tipo</dt>
              <dd className="capitalize">{service.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Duração</dt>
              <dd>{service.durationMin} min</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Especialidade</dt>
              <dd>{service.specialty?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Requer profissional</dt>
              <dd>{service.requiresProfessional ? 'Sim' : 'Não'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Requer sala</dt>
              <dd>{service.requiresRoom ? 'Sim' : 'Não'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Versão</dt>
              <dd>v{service.version}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h3 className="mb-3">Preço atual</h3>
          {price ? (
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-slate-500">Valor</dt>
                <dd className="font-semibold text-brand-emerald">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: price.currency }).format(Number(price.amount))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Válido desde</dt>
                <dd>{new Date(price.validFrom).toLocaleDateString('pt-BR')}</dd>
              </div>
              {price.validUntil && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Válido até</dt>
                  <dd>{new Date(price.validUntil).toLocaleDateString('pt-BR')}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-slate-400 text-sm">Sem preço cadastrado.</p>
          )}
        </div>
      </div>

      {service.description && (
        <div className="card">
          <h3 className="mb-2">Descrição</h3>
          <p className="text-slate-600 text-sm">{service.description}</p>
        </div>
      )}
    </div>
  );
}
