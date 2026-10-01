'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { ArrowLeft, Clock, UserPlus, Bell, X, CheckCircle2 } from 'lucide-react';

interface WaitListEntry {
  id: string;
  status: string;
  priority: number;
  notes?: string;
  requestedAt: string;
  notifiedAt?: string;
  patient: { id: string; name: string; telefone?: string };
  scheduledAppointment?: { id: string; startsAt: string; status: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: 'Aguardando',
  NOTIFICADO: 'Notificado',
  AGENDADO: 'Agendado',
  CANCELADO: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  AGUARDANDO: 'text-amber-700 bg-amber-50 border-amber-200',
  NOTIFICADO: 'text-blue-700 bg-blue-50 border-blue-200',
  AGENDADO: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  CANCELADO: 'text-slate-500 bg-slate-50 border-slate-200',
};

export default function WaitListPage() {
  const token = useToken();
  const [entries, setEntries] = useState<WaitListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('AGUARDANDO');
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set('status', filterStatus);
      const data = await api.get<WaitListEntry[]>(`/scheduling/wait-list?${qs}`, token);
      setEntries(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token, filterStatus]);

  async function notify(id: string) {
    if (!token) return;
    setActionId(id);
    try {
      await api.post(`/scheduling/wait-list/${id}/notify`, {}, token);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionId(null);
    }
  }

  async function cancel(id: string) {
    if (!token) return;
    setActionId(id);
    try {
      await api.post(`/scheduling/wait-list/${id}/cancel`, {}, token);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/schedule" className="text-slate-400 hover:text-slate-700"><ArrowLeft size={20} /></Link>
        <h1>Lista de Espera</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {['AGUARDANDO', 'NOTIFICADO', 'AGENDADO', 'CANCELADO'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filterStatus === s ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <Link href="/appointments/new" className="btn-primary ml-auto">
          <UserPlus size={14} /> Novo agendamento
        </Link>
      </div>

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Carregando…</div>
      ) : entries.length === 0 ? (
        <div className="card py-12 text-center text-slate-400">
          <Clock size={32} className="mx-auto mb-2 opacity-40" />
          Nenhuma entrada na lista de espera com status &quot;{STATUS_LABEL[filterStatus]}&quot;
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-surface-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Prioridade</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Solicitado em</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Observações</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/patients/${e.patient.id}`} className="font-medium text-slate-900 hover:text-brand-emerald">
                      {e.patient.name}
                    </Link>
                    {e.patient.telefone && (
                      <p className="text-xs text-slate-400">{e.patient.telefone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.priority > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                      {e.priority > 0 ? `Prioridade ${e.priority}` : 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {new Date(e.requestedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOR[e.status] ?? ''}`}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </span>
                    {e.scheduledAppointment && (
                      <Link href={`/appointments/${e.scheduledAppointment.id}`} className="block text-xs text-brand-emerald mt-1 hover:underline">
                        Ver agendamento
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{e.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    {e.status === 'AGUARDANDO' && (
                      <div className="flex gap-1">
                        <button
                          className="btn-secondary py-1 px-2 text-xs"
                          disabled={actionId === e.id}
                          onClick={() => notify(e.id)}
                          title="Notificar paciente"
                        >
                          <Bell size={12} /> Notificar
                        </button>
                        <Link
                          href={`/appointments/new?patientId=${e.patient.id}`}
                          className="btn-primary py-1 px-2 text-xs"
                          title="Agendar"
                        >
                          <CheckCircle2 size={12} /> Agendar
                        </Link>
                        <button
                          className="btn-secondary py-1 px-2 text-xs text-red-600"
                          disabled={actionId === e.id}
                          onClick={() => cancel(e.id)}
                          title="Remover da lista"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {e.status === 'NOTIFICADO' && (
                      <Link
                        href={`/appointments/new?patientId=${e.patient.id}`}
                        className="btn-primary py-1 px-2 text-xs"
                      >
                        <CheckCircle2 size={12} /> Agendar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
