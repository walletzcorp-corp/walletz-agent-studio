import { getToken } from '@/lib/server-token';
import { api } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const token = await getToken();

  let patient: any = null;
  let appointments: any[] = [];

  try {
    patient = await api.get(`/patients/${params.id}`, token);
  } catch {
    notFound();
  }

  try {
    const appts = await api.get<any>(`/appointments?patientId=${params.id}&limit=20`, token);
    appointments = appts.data ?? [];
  } catch {}

  const STATUS_LABEL: Record<string, string> = {
    AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', AGUARDANDO: 'Aguardando',
    EM_ATENDIMENTO: 'Em atendimento', FINALIZADO: 'Finalizado',
    CANCELADO: 'Cancelado', NAO_COMPARECEU: 'Não compareceu', REAGENDADO: 'Reagendado',
  };

  const STATUS_COLOR: Record<string, string> = {
    AGENDADO: 'text-blue-700 bg-blue-50', CONFIRMADO: 'text-emerald-700 bg-emerald-50',
    AGUARDANDO: 'text-amber-700 bg-amber-50', EM_ATENDIMENTO: 'text-purple-700 bg-purple-50',
    FINALIZADO: 'text-slate-700 bg-slate-100', CANCELADO: 'text-red-700 bg-red-50',
    NAO_COMPARECEU: 'text-orange-700 bg-orange-50', REAGENDADO: 'text-slate-500 bg-slate-50',
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients" className="text-slate-400 hover:text-slate-700">
          <ArrowLeft size={20} />
        </Link>
        <h1>{patient.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h2 className="text-base font-semibold mb-3">Dados pessoais</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">CPF</dt>
              <dd className="font-mono">{patient.cpf ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Data Nasc.</dt>
              <dd>{patient.dataNasc ? new Date(patient.dataNasc).toLocaleDateString('pt-BR') : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Sexo</dt>
              <dd>{{ F: 'Feminino', M: 'Masculino', O: 'Outro' }[patient.sexo as string] ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Telefone</dt>
              <dd>{patient.telefone ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">E-mail</dt>
              <dd>{patient.email ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold mb-3">Observações</h2>
          <p className="text-sm text-slate-600">{patient.notes ?? 'Nenhuma observação registrada.'}</p>
          <div className="mt-4">
            <Link href={`/appointments/new?patientId=${patient.id}`} className="btn-primary text-sm">
              <Calendar size={14} /> Agendar
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold mb-4">Histórico de agendamentos</h2>
        {appointments.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Nenhum agendamento encontrado</p>
        ) : (
          <div className="divide-y divide-surface-border">
            {appointments.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(a.startsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {' → '}
                    {new Date(a.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.service?.name ?? a.type} • {a.professional?.name ?? 'Sem profissional'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[a.status] ?? 'bg-slate-50 text-slate-600'}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                  <Link href={`/appointments/${a.id}`} className="text-brand-emerald hover:underline text-xs">Ver</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
