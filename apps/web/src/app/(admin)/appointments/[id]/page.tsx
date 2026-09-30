'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', AGUARDANDO: 'Aguardando na recepção',
  EM_ATENDIMENTO: 'Em atendimento', FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado', NAO_COMPARECEU: 'Não compareceu', REAGENDADO: 'Reagendado',
};

const STATUS_COLOR: Record<string, string> = {
  AGENDADO: 'text-blue-700 bg-blue-50 border-blue-200',
  CONFIRMADO: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  AGUARDANDO: 'text-amber-700 bg-amber-50 border-amber-200',
  EM_ATENDIMENTO: 'text-purple-700 bg-purple-50 border-purple-200',
  FINALIZADO: 'text-slate-700 bg-slate-100 border-slate-200',
  CANCELADO: 'text-red-700 bg-red-50 border-red-200',
  NAO_COMPARECEU: 'text-orange-700 bg-orange-50 border-orange-200',
  REAGENDADO: 'text-slate-500 bg-slate-50 border-slate-200',
};

interface Appointment {
  id: string;
  status: string;
  type: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
  cancelReason?: string;
  isOnlineBooking: boolean;
  checkInAt?: string;
  startedAt?: string;
  finishedAt?: string;
  waitingMinutes?: number;
  delayMinutes?: number;
  rowVersion: number;
  patient: { id: string; name: string; cpf?: string; telefone?: string };
  professional?: { id: string; name: string };
  service?: { id: string; name: string; durationMin: number };
  resource?: { id: string; name: string; type: string };
  unit: { id: string; name: string };
  history: { id: string; fromStatus?: string; toStatus: string; changedBy: string; changedAt: string; reason?: string }[];
}

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const token = useToken();
  const router = useRouter();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  async function load() {
    if (!token) return;
    try {
      const data = await api.get<Appointment>(`/appointments/${id}`, token);
      setAppt(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token, id]);

  async function doAction(endpoint: string, body?: Record<string, unknown>) {
    if (!appt || !token) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/appointments/${id}/${endpoint}`, { rowVersion: appt.rowVersion, ...body }, token);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao executar ação');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="text-slate-400 py-12 text-center">Carregando…</div>;
  if (!appt) return <div className="text-red-600 py-12 text-center">{error || 'Agendamento não encontrado'}</div>;

  const TYPE_LABEL: Record<string, string> = {
    CONSULTA: 'Consulta', RETORNO: 'Retorno', SESSAO: 'Sessão',
    PROCEDIMENTO: 'Procedimento', TELECONSULTA: 'Teleconsulta',
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/schedule" className="text-slate-400 hover:text-slate-700"><ArrowLeft size={20} /></Link>
        <h1>Agendamento</h1>
        <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLOR[appt.status]}`}>
          {STATUS_LABEL[appt.status] ?? appt.status}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h2 className="text-base font-semibold mb-3">Detalhes</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Tipo</dt>
              <dd>{TYPE_LABEL[appt.type] ?? appt.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Data/Hora</dt>
              <dd>{new Date(appt.startsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} – {new Date(appt.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Unidade</dt>
              <dd>{appt.unit.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Profissional</dt>
              <dd>{appt.professional?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Serviço</dt>
              <dd>{appt.service?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Recurso</dt>
              <dd>{appt.resource?.name ?? '—'}</dd>
            </div>
            {appt.isOnlineBooking && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Online</dt>
                <dd className="text-brand-emerald">Sim</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold mb-3">Paciente</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Nome</dt>
              <dd><Link href={`/patients/${appt.patient.id}`} className="text-brand-emerald hover:underline">{appt.patient.name}</Link></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">CPF</dt>
              <dd className="font-mono text-xs">{appt.patient.cpf ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Telefone</dt>
              <dd>{appt.patient.telefone ?? '—'}</dd>
            </div>
          </dl>

          {/* RF-AGE-012: Indicadores */}
          {(appt.waitingMinutes != null || appt.delayMinutes != null) && (
            <div className="mt-4 pt-3 border-t border-surface-border space-y-1">
              {appt.waitingMinutes != null && (
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  <Clock size={12} /> Espera: {appt.waitingMinutes} min
                </div>
              )}
              {appt.delayMinutes != null && appt.delayMinutes > 0 && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertTriangle size={12} /> Atraso: {appt.delayMinutes} min
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {appt.notes && (
        <div className="card mb-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-1">Observações</h2>
          <p className="text-sm text-slate-700">{appt.notes}</p>
        </div>
      )}

      {appt.cancelReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          <strong>Motivo do cancelamento:</strong> {appt.cancelReason}
        </div>
      )}

      {/* RF-AGE-009: Jornada operacional */}
      {!['CANCELADO', 'FINALIZADO', 'NAO_COMPARECEU', 'REAGENDADO'].includes(appt.status) && (
        <div className="card mb-4">
          <h2 className="text-base font-semibold mb-3">Jornada do atendimento</h2>
          <div className="flex flex-wrap gap-2">
            {appt.status === 'AGENDADO' && (
              <button className="btn-secondary" disabled={actionLoading} onClick={() => doAction('confirm')}>
                <CheckCircle2 size={14} /> Confirmar
              </button>
            )}
            {['AGENDADO', 'CONFIRMADO'].includes(appt.status) && (
              <button className="btn-secondary" disabled={actionLoading} onClick={() => doAction('checkin')}>
                <Clock size={14} /> Check-in / Chegou
              </button>
            )}
            {appt.status === 'AGUARDANDO' && (
              <button className="btn-primary" disabled={actionLoading} onClick={() => doAction('start')}>
                Iniciar atendimento
              </button>
            )}
            {appt.status === 'EM_ATENDIMENTO' && (
              <button className="btn-primary" disabled={actionLoading} onClick={() => doAction('finish')}>
                <CheckCircle2 size={14} /> Finalizar
              </button>
            )}
            {['AGENDADO', 'CONFIRMADO'].includes(appt.status) && (
              <button className="btn-secondary text-orange-600" disabled={actionLoading} onClick={() => doAction('no-show')}>
                <XCircle size={14} /> Não compareceu
              </button>
            )}
            {['AGENDADO', 'CONFIRMADO'].includes(appt.status) && (
              <>
                {!showCancel ? (
                  <button className="btn-secondary text-red-600" onClick={() => setShowCancel(true)}>
                    <XCircle size={14} /> Cancelar
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full mt-2">
                    <input className="input flex-1 py-1.5" placeholder="Motivo do cancelamento…"
                      value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                    <button className="btn-secondary text-red-600 py-1.5" disabled={actionLoading || !cancelReason}
                      onClick={() => { doAction('cancel', { reason: cancelReason }); setShowCancel(false); }}>
                      Confirmar cancelamento
                    </button>
                    <button className="btn-secondary py-1.5" onClick={() => setShowCancel(false)}>Voltar</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="card">
        <h2 className="text-base font-semibold mb-3">Histórico de status</h2>
        <div className="space-y-2">
          {appt.history.map((h) => (
            <div key={h.id} className="flex items-center gap-3 text-sm">
              <span className="text-slate-400 text-xs shrink-0">
                {new Date(h.changedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
              <span className="text-slate-600">
                {h.fromStatus ? `${STATUS_LABEL[h.fromStatus] ?? h.fromStatus} → ` : ''}
                <span className="font-medium">{STATUS_LABEL[h.toStatus] ?? h.toStatus}</span>
              </span>
              {h.reason && <span className="text-slate-400 text-xs">"{h.reason}"</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
