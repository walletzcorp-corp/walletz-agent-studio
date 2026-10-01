'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { Ticket, ChevronRight, RefreshCw, Route } from 'lucide-react';

const TICKET_STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: 'Aguardando', CHAMADO: 'Chamado', EM_ATENDIMENTO: 'Em atendimento',
  FINALIZADO: 'Finalizado', DESISTIU: 'Desistiu',
};

const TICKET_COLOR: Record<string, string> = {
  AGUARDANDO: 'bg-amber-50 border-amber-200 text-amber-800',
  CHAMADO: 'bg-blue-100 border-blue-300 text-blue-800 font-bold',
  EM_ATENDIMENTO: 'bg-purple-100 border-purple-300 text-purple-800',
  FINALIZADO: 'bg-slate-100 border-slate-200 text-slate-500',
  DESISTIU: 'bg-red-50 border-red-200 text-red-500 opacity-60',
};

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Normal', 1: 'Idoso (60+)', 2: 'Gestante', 3: 'Deficiente', 4: 'Emergência',
};

export default function QueuePage() {
  const token = useToken();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [issuePriority, setIssuePriority] = useState(0);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => {
        const list = r.data ?? r.items ?? [];
        setOrgs(list);
        if (list.length === 1) setSelectedOrg(list[0].id);
      }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !selectedOrg) return;
    api.get<any>(`/units?organizationId=${selectedOrg}&limit=100`, token)
      .then((r) => {
        const list = r.data ?? r.items ?? [];
        setUnits(list);
        if (list.length === 1) setSelectedUnit(list[0].id);
      }).catch(() => {});
  }, [token, selectedOrg]);

  const loadQueue = useCallback(async () => {
    if (!token || !selectedUnit || !date) return;
    setLoading(true);
    setError('');
    try {
      const q = await api.get<any>(`/queue?unitId=${selectedUnit}&date=${date}`, token);
      setQueue(q);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar fila');
    } finally {
      setLoading(false);
    }
  }, [token, selectedUnit, date]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  useEffect(() => {
    if (!token || !selectedOrg || !patientSearch || patientSearch.length < 2) return;
    api.get<any>(`/patients?organizationId=${selectedOrg}&search=${patientSearch}&limit=10`, token)
      .then((r) => setPatients(r.data ?? [])).catch(() => {});
  }, [token, selectedOrg, patientSearch]);

  async function issueTicket() {
    if (!queue || !token) return;
    setActionLoading(true);
    try {
      await api.post(`/queue/${queue.id}/tickets`, { patientId: selectedPatient || undefined, priority: issuePriority }, token);
      setSelectedPatient('');
      setPatientSearch('');
      setIssuePriority(0);
      await loadQueue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function callNext() {
    if (!queue || !token) return;
    setActionLoading(true);
    try {
      await api.post(`/queue/${queue.id}/call-next`, {}, token);
      await loadQueue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function updateTicket(ticketId: string, status: string) {
    if (!token) return;
    setActionLoading(true);
    try {
      await api.patch(`/queue/tickets/${ticketId}/status`, { status }, token);
      await loadQueue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  // RF-AGE-016: routing state per ticket (session-local — stored until page refresh)
  const [routingSteps, setRoutingSteps] = useState<Record<string, number>>({});

  function advanceRouting(ticketId: string, max = 3) {
    setRoutingSteps((prev) => ({
      ...prev,
      [ticketId]: Math.min((prev[ticketId] ?? 0) + 1, max),
    }));
  }

  async function setQueueStatus(status: string) {
    if (!queue || !token) return;
    setActionLoading(true);
    try {
      await api.patch(`/queue/${queue.id}/status`, { status }, token);
      await loadQueue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  const waiting = queue?.tickets?.filter((t: any) => t.status === 'AGUARDANDO') ?? [];
  const called = queue?.tickets?.filter((t: any) => t.status === 'CHAMADO') ?? [];
  const inService = queue?.tickets?.filter((t: any) => t.status === 'EM_ATENDIMENTO') ?? [];
  const done = queue?.tickets?.filter((t: any) => ['FINALIZADO', 'DESISTIU'].includes(t.status)) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>Fila de Atendimento</h1>
        <button onClick={loadQueue} className="btn-secondary py-1.5 text-sm">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        {orgs.length > 1 && (
          <select className="input py-1.5 text-sm w-52" value={selectedOrg}
            onChange={(e) => { setSelectedOrg(e.target.value); setSelectedUnit(''); setQueue(null); }}>
            <option value="">Selecione a organização</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
          </select>
        )}
        <select className="input py-1.5 text-sm w-52" value={selectedUnit}
          onChange={(e) => { setSelectedUnit(e.target.value); setQueue(null); }}>
          <option value="">Selecione a unidade</option>
          {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="date" className="input py-1.5 text-sm" value={date}
          onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {!queue && !loading && (
        <div className="text-slate-400 py-12 text-center">
          <Ticket size={40} className="mx-auto mb-3 opacity-30" />
          <p>Selecione uma unidade e data para ver a fila</p>
        </div>
      )}

      {loading && <div className="text-slate-400 py-12 text-center">Carregando…</div>}

      {queue && (
        <>
          {/* Queue header */}
          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Fila — {new Date(queue.date).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Última senha: <span className="font-mono font-bold">{queue.lastTicketNumber}</span>
                {' · '}
                Aguardando: <span className="font-bold text-amber-600">{waiting.length}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                queue.status === 'ABERTA' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                queue.status === 'PAUSADA' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-red-50 border-red-200 text-red-700'
              }`}>{queue.status}</span>
              {queue.status === 'ABERTA' && (
                <button className="btn-secondary text-xs py-1" onClick={() => setQueueStatus('PAUSADA')} disabled={actionLoading}>Pausar</button>
              )}
              {queue.status === 'PAUSADA' && (
                <button className="btn-secondary text-xs py-1" onClick={() => setQueueStatus('ABERTA')} disabled={actionLoading}>Reabrir</button>
              )}
              {queue.status !== 'FECHADA' && (
                <button className="btn-secondary text-xs py-1 text-red-600" onClick={() => setQueueStatus('FECHADA')} disabled={actionLoading}>Fechar</button>
              )}
            </div>
          </div>

          {/* Issue ticket + call next */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card">
              <h2 className="text-sm font-semibold mb-3">Emitir senha</h2>
              <div className="space-y-2">
                <select className="input py-1.5 text-sm" value={issuePriority}
                  onChange={(e) => setIssuePriority(+e.target.value)}>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <div className="relative">
                  <input className="input py-1.5 text-sm" placeholder="Paciente (opcional)…"
                    value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(''); }} />
                  {patients.length > 0 && patientSearch && !selectedPatient && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-surface-border rounded-lg shadow-lg z-10 max-h-40 overflow-auto">
                      {patients.map((p: any) => (
                        <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={() => { setSelectedPatient(p.id); setPatientSearch(p.name); setPatients([]); }}>
                          {p.name} {p.cpf ? `· ${p.cpf}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn-primary w-full text-sm py-1.5" disabled={actionLoading || queue.status !== 'ABERTA'} onClick={issueTicket}>
                  <Ticket size={14} /> Emitir senha
                </button>
              </div>
            </div>

            <div className="card flex flex-col items-center justify-center gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Próxima na fila</p>
                {waiting.length > 0 ? (
                  <p className="text-4xl font-bold font-mono text-brand-emerald">
                    {waiting[0].ticketNumber}
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm">Fila vazia</p>
                )}
              </div>
              <button className="btn-primary" disabled={actionLoading || waiting.length === 0 || queue.status !== 'ABERTA'} onClick={callNext}>
                <ChevronRight size={16} /> Chamar próximo
              </button>
            </div>
          </div>

          {/* Ticket lists */}
          <div className="grid grid-cols-2 gap-4">
            {/* Aguardando */}
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Aguardando ({waiting.length})</h3>
              <div className="space-y-1">
                {waiting.map((t: any) => (
                  <div key={t.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${TICKET_COLOR[t.status]}`}>
                    <div>
                      <span className="font-mono font-bold">{t.ticketNumber}</span>
                      {t.priority > 0 && <span className="ml-2 text-xs bg-white/60 px-1 rounded">{PRIORITY_LABELS[t.priority]}</span>}
                      {t.patient && <span className="ml-2 text-xs opacity-70">{t.patient.name}</span>}
                    </div>
                    <button className="text-xs underline opacity-70" disabled={actionLoading} onClick={() => updateTicket(t.id, 'DESISTIU')}>
                      Desistiu
                    </button>
                  </div>
                ))}
                {waiting.length === 0 && <p className="text-xs text-slate-400 py-2">Nenhuma senha</p>}
              </div>
            </div>

            {/* Chamado / Em atendimento */}
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Chamado / Em atendimento ({called.length + inService.length})</h3>
              <div className="space-y-1">
                {[...called, ...inService].map((t: any) => {
                  const step = routingSteps[t.id] ?? 0;
                  const ROUTING_STEPS = ['Triagem', 'Consulta', 'Procedimento', 'Alta'];
                  return (
                    <div key={t.id} className={`px-3 py-2 rounded-lg border text-sm ${TICKET_COLOR[t.status]}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-mono font-bold">{t.ticketNumber}</span>
                          {t.patient && (
                            <Link href={`/patients/${t.patient.id}`} className="ml-2 text-xs opacity-70 hover:underline">
                              {t.patient.name}
                            </Link>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {t.status === 'CHAMADO' && (
                            <button className="text-xs underline" disabled={actionLoading} onClick={() => updateTicket(t.id, 'EM_ATENDIMENTO')}>
                              Iniciar
                            </button>
                          )}
                          {t.status === 'EM_ATENDIMENTO' && (
                            <button className="text-xs underline" disabled={actionLoading} onClick={() => updateTicket(t.id, 'FINALIZADO')}>
                              Finalizar
                            </button>
                          )}
                        </div>
                      </div>
                      {/* RF-AGE-016: Routing stepper */}
                      <div className="flex items-center gap-1 mt-1">
                        <Route size={10} className="text-purple-400 shrink-0" />
                        {ROUTING_STEPS.map((s, i) => (
                          <div key={s} className="flex items-center gap-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs cursor-pointer select-none transition-colors ${
                              i < step ? 'bg-emerald-100 text-emerald-700 line-through opacity-60' :
                              i === step ? 'bg-purple-100 text-purple-700 font-semibold ring-1 ring-purple-300' :
                              'bg-white/60 text-slate-400'
                            }`}
                              onClick={() => i === step && advanceRouting(t.id, ROUTING_STEPS.length - 1)}
                              title={i === step ? `Avançar para próxima etapa` : undefined}
                            >
                              {s}
                            </span>
                            {i < ROUTING_STEPS.length - 1 && <ChevronRight size={8} className="text-slate-300 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {called.length + inService.length === 0 && <p className="text-xs text-slate-400 py-2">Nenhuma senha</p>}
              </div>

              <h3 className="text-sm font-semibold text-slate-600 mb-2 mt-4">Finalizados hoje ({done.length})</h3>
              <div className="space-y-1">
                {done.slice(-5).reverse().map((t: any) => (
                  <div key={t.id} className={`px-3 py-2 rounded-lg border text-sm ${TICKET_COLOR[t.status]}`}>
                    <span className="font-mono font-bold">{t.ticketNumber}</span>
                    {t.patient && <span className="ml-2 text-xs">{t.patient.name}</span>}
                    <span className="ml-2 text-xs">{TICKET_STATUS_LABEL[t.status]}</span>
                  </div>
                ))}
                {done.length === 0 && <p className="text-xs text-slate-400 py-2">Nenhuma senha</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
