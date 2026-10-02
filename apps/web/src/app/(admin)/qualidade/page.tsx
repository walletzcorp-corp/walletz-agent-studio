'use client';

import { useState, useEffect } from 'react';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { ShieldCheck, AlertCircle, ClipboardList, BarChart3, RefreshCw } from 'lucide-react';

type Tab = 'incidentes' | 'acoes' | 'protocolos' | 'indicadores';

const TYPE_LABELS: Record<string, string> = {
  QUASE_FALHA: 'Quase-falha',
  INCIDENTE_SEM_DANO: 'Incidente s/ dano',
  INCIDENTE_COM_DANO: 'Incidente c/ dano',
  EVENTO_SENTINELA: 'Evento sentinela',
};

const STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-blue-100 text-blue-700',
  EM_ANALISE: 'bg-yellow-100 text-yellow-700',
  EM_ACAO: 'bg-purple-100 text-purple-700',
  ENCERRADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
};

const TYPE_COLORS: Record<string, string> = {
  QUASE_FALHA: 'bg-yellow-50 border-yellow-300',
  INCIDENTE_SEM_DANO: 'bg-orange-50 border-orange-300',
  INCIDENTE_COM_DANO: 'bg-red-50 border-red-300',
  EVENTO_SENTINELA: 'bg-red-100 border-red-500',
};

export default function QualidadePage() {
  const token = useToken();
  const [tab, setTab] = useState<Tab>('incidentes');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [orgId, setOrgId] = useState('');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
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
    Promise.all([
      api.get<any>(`/qua/${orgId}/incidentes`, token).catch(() => []),
      api.get<any>(`/qua/${orgId}/acoes`, token).catch(() => []),
      api.get<any>(`/qua/${orgId}/protocolos`, token).catch(() => []),
    ]).then(([inc, act, prot]) => {
      setIncidents(Array.isArray(inc) ? inc : inc.items ?? []);
      setActions(Array.isArray(act) ? act : act.items ?? []);
      setProtocols(Array.isArray(prot) ? prot : prot.items ?? []);
    }).catch((e) => setError(e.message ?? 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [orgId, token]);

  const openCount = incidents.filter((i) => i.status === 'ABERTO').length;
  const inAnalysisCount = incidents.filter((i) => i.status === 'EM_ANALISE').length;
  const pendingActions = actions.filter((a) => a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA').length;
  const closedCount = incidents.filter((i) => i.status === 'ENCERRADO').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Qualidade e Segurança do Paciente</h1>
            <p className="text-sm text-gray-500">M15 QUA — Incidentes, análise de causa, ações corretivas, indicadores</p>
          </div>
        </div>
        <select className="input w-64" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          <option value="">Selecione organização…</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Incidentes Abertos', value: openCount, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Em Análise', value: inAnalysisCount, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Ações Pendentes', value: pendingActions, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Encerrados', value: closedCount, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(['incidentes', 'acoes', 'protocolos', 'indicadores'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'acoes' ? 'Planos de Ação' : t === 'incidentes' ? 'Incidentes' : t === 'protocolos' ? 'Protocolos' : 'Indicadores'}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw size={14} className="animate-spin" /> Carregando…
        </div>
      )}

      {tab === 'incidentes' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Notificações de Incidentes</h2>
          {incidents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhum incidente notificado para esta organização.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((i) => (
                <div key={i.id} className={`border rounded-xl p-4 ${TYPE_COLORS[i.incidentType] ?? 'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium bg-white px-2 py-0.5 rounded border border-gray-200">
                          {TYPE_LABELS[i.incidentType] ?? i.incidentType}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {i.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{i.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Ocorrido: {i.occurredAt ? new Date(i.occurredAt).toLocaleString('pt-BR') : '—'}
                        {' · '}
                        {i.isAnonymous ? 'Relato anônimo' : i.reportedByName ? `Notificado por: ${i.reportedByName}` : ''}
                      </p>
                    </div>
                    {(i.status === 'ABERTO' || i.status === 'EM_ANALISE') && (
                      <button
                        className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-white"
                        onClick={async () => {
                          if (!token) return;
                          await api.patch(`/qua/${orgId}/incidentes/${i.id}/analise`, {}, token).catch(() => {});
                          const updated = await api.get<any>(`/qua/${orgId}/incidentes`, token).catch(() => []);
                          setIncidents(Array.isArray(updated) ? updated : updated.items ?? []);
                        }}
                      >
                        Analisar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'acoes' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Planos de Ação Corretiva/Preventiva</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Ação corretiva só pode ser encerrada com evidência e verificação de efetividade por responsável.
          </div>
          {actions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhum plano de ação cadastrado.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Ação</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Prazo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {actions.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                      <td className="px-4 py-3 text-gray-600">{a.actionType ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.status === 'PENDENTE' ? 'bg-gray-100 text-gray-600' :
                          a.status === 'EM_ANDAMENTO' ? 'bg-yellow-100 text-yellow-700' :
                          a.status === 'CONCLUIDA' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.dueDate ? new Date(a.dueDate).toLocaleDateString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'protocolos' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Protocolos e Políticas de Qualidade</h2>
          {protocols.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              Nenhum protocolo cadastrado.
            </div>
          ) : (
            <div className="space-y-3">
              {protocols.map((p) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{p.title ?? p.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'APROVADO' || p.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'indicadores' && !loading && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Indicadores de Qualidade</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <BarChart3 className="h-4 w-4 inline mr-1" />
            Evite métricas que incentivem subnotificação de incidentes. A cultura de segurança depende do relato livre e confiável.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Indicadores disponíveis em breve.
          </div>
        </div>
      )}
    </div>
  );
}
