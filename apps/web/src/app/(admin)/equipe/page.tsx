'use client';

import { useState, useEffect } from 'react';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { Users, Award, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

type Tab = 'credenciais' | 'competencias' | 'escalas' | 'turnos';

const CREDENTIAL_STATUS_COLORS: Record<string, string> = {
  ATIVA: 'bg-green-100 text-green-700',
  VENCIDA: 'bg-red-100 text-red-700',
  SUSPENSA: 'bg-yellow-100 text-yellow-700',
  CANCELADA: 'bg-gray-100 text-gray-500',
};

const SHIFT_STATUS_COLORS: Record<string, string> = {
  AGENDADO: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-green-100 text-green-700',
  CONCLUIDO: 'bg-gray-100 text-gray-600',
  CANCELADO: 'bg-red-100 text-red-700',
  FALTA: 'bg-orange-100 text-orange-700',
  SUBSTITUIDO: 'bg-yellow-100 text-yellow-700',
};

export default function EquipePage() {
  const token = useToken();
  const [tab, setTab] = useState<Tab>('credenciais');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [orgId, setOrgId] = useState('');
  const [credentials, setCredentials] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => {
        const list = r.items ?? r.data ?? [];
        setOrgs(list);
        if (list.length > 0) setOrgId(list[0].id);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!orgId || !token) return;
    setLoading(true);
    setError('');
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      api.get<any>(`/eqp/${orgId}/credenciais`, token).catch(() => []),
      api.get<any>(`/eqp/${orgId}/competencias`, token).catch(() => []),
      api.get<any>(`/eqp/${orgId}/escalas`, token).catch(() => []),
      api.get<any>(`/eqp/${orgId}/turnos?from=${today}&to=${today}`, token).catch(() => []),
    ]).then(([cred, comp, sched, shft]) => {
      setCredentials(Array.isArray(cred) ? cred : cred.items ?? []);
      setCompetencies(Array.isArray(comp) ? comp : comp.items ?? []);
      setSchedules(Array.isArray(sched) ? sched : sched.items ?? []);
      setShifts(Array.isArray(shft) ? shft : shft.items ?? []);
    }).catch((e) => setError(e.message ?? 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [orgId, token]);

  const expiredCount = credentials.filter((c) => c.status === 'VENCIDA').length;
  const activeCount = credentials.filter((c) => c.status === 'ATIVA').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-violet-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipe</h1>
            <p className="text-sm text-gray-500">M17 EQP — Credenciais, competências, escalas e turnos</p>
          </div>
        </div>
        <select className="input w-64" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          <option value="">Selecione organização…</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {expiredCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <strong>{expiredCount} credencial(is) vencida(s)</strong> — revise e atualize antes do próximo atendimento.
            Habilitação clínica não deve ser inferida pela função cadastrada; exija credencial verificável.
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Credenciais Ativas', value: activeCount, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Credenciais Vencidas', value: expiredCount, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Turnos Hoje', value: shifts.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Escalas Ativas', value: schedules.length, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((c) => (
          <div key={c.label} className={`${c.bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(['credenciais', 'competencias', 'escalas', 'turnos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'credenciais' ? 'Credenciais' : t === 'competencias' ? 'Competências' : t === 'escalas' ? 'Escalas' : 'Turnos'}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw size={14} className="animate-spin" /> Carregando…
        </div>
      )}

      {tab === 'credenciais' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Credenciais e Registros Profissionais</h2>
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
            <Award className="h-4 w-4 inline mr-1" />
            Não infira habilitação clínica pela função cadastrada. Alterações de credencial geram auditoria automática.
          </div>
          {credentials.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhuma credencial cadastrada para esta organização.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Profissional</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Número</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Órgão</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Vencimento</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {credentials.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.professional?.name ?? c.professionalName ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{c.credentialType}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.number ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.issuingBody ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CREDENTIAL_STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'competencias' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Competências e Habilitações</h2>
          {competencies.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhuma competência cadastrada.
            </div>
          ) : (
            <div className="space-y-3">
              {competencies.map((c) => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{c.competencyName}</span>
                      {c.level && <span className="ml-2 text-xs text-gray-500">Nível: {c.level}</span>}
                    </div>
                    {c.expiresAt && (
                      <span className="text-xs text-gray-500">Vence: {new Date(c.expiresAt).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'escalas' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Escalas de Trabalho</h2>
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
            <Calendar className="h-4 w-4 inline mr-1" />
            Escalas impedem conflitos óbvios de horário. Histórico de alterações é preservado. Comunicação não expõe dados clínicos.
          </div>
          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhuma escala cadastrada.
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {s.startDate ? new Date(s.startDate).toLocaleDateString('pt-BR') : '—'}
                    {s.endDate ? ` – ${new Date(s.endDate).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'turnos' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Turnos de Hoje</h2>
          {shifts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhum turno registrado para hoje.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Profissional</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Função</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Início</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Fim</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.professional?.name ?? s.professionalName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.role ?? s.professional?.role ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.shiftStart ? new Date(s.shiftStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.shiftEnd ? new Date(s.shiftEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SHIFT_STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
