'use client';

import { useState, useEffect } from 'react';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { Pill, ShieldAlert, FlaskConical, AlertTriangle, RefreshCw } from 'lucide-react';

type Tab = 'registros' | 'protocolos' | 'lotes' | 'reacoes';

const TAB_LABELS: Record<Tab, string> = {
  registros: 'Registros de Administração',
  protocolos: 'Protocolos',
  lotes: 'Alertas de Lote',
  reacoes: 'Reações Adversas',
};

const STATUS_COLORS: Record<string, string> = {
  RESERVADO: 'bg-gray-100 text-gray-700',
  PREPARADO: 'bg-yellow-100 text-yellow-700',
  ADMINISTRADO: 'bg-green-100 text-green-700',
  DEVOLVIDO: 'bg-blue-100 text-blue-700',
  DESCARTADO: 'bg-orange-100 text-orange-700',
  BAIXADO: 'bg-purple-100 text-purple-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

export default function MedicamentosPage() {
  const token = useToken();
  const [tab, setTab] = useState<Tab>('registros');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [orgId, setOrgId] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [lotAlerts, setLotAlerts] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
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
      api.get<any>(`/med/${orgId}/registros`, token).catch(() => []),
      api.get<any>(`/med/${orgId}/protocolos`, token).catch(() => []),
      api.get<any>(`/med/${orgId}/lotes/alertas`, token).catch(() => []),
      api.get<any>(`/med/${orgId}/reacoes`, token).catch(() => []),
    ]).then(([rec, prot, lots, rxn]) => {
      setRecords(Array.isArray(rec) ? rec : rec.items ?? []);
      setProtocols(Array.isArray(prot) ? prot : prot.items ?? []);
      setLotAlerts(Array.isArray(lots) ? lots : lots.items ?? []);
      setReactions(Array.isArray(rxn) ? rxn : rxn.items ?? []);
    }).catch((e) => setError(e.message ?? 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [orgId, token]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pill className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Segurança de Medicamentos</h1>
            <p className="text-sm text-gray-500">M14 MED — Administração, dupla checagem, rastreabilidade de lotes</p>
          </div>
        </div>
        <select
          className="input w-64"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
        >
          <option value="">Selecione organização…</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
        </select>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Regras de segurança obrigatórias:</strong> Confirme o paciente com dois identificadores antes de administrar.
          Verifique lote, validade e alergias. Protocolo com dupla checagem exige dois profissionais distintos.
          Registros administrados não podem ser apagados — correções geram adendo auditável.
          A aplicação auxilia a execução; não substitui julgamento clínico.
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw size={14} className="animate-spin" /> Carregando…
        </div>
      )}

      {tab === 'registros' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Registros de Administração</h2>
          </div>
          {records.length === 0 && !loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhum registro encontrado para esta organização.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Paciente</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Medicamento</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Dose/Via</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Horário</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Administrado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.patientId ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.medicationName ?? r.protocolName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.dose ? `${r.dose}${r.doseUnit ?? ''} — ${r.route ?? '—'}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.scheduledAt ? new Date(r.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100'}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.administeredBy ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'lotes' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Alertas de Lote Ativos</h2>
          {lotAlerts.filter((a) => a.active !== false).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhum alerta de lote ativo.
            </div>
          ) : (
            lotAlerts.filter((a) => a.active !== false).map((a) => (
              <div key={a.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-red-800">{a.medicationName}</span>
                    {a.lotNumber && <span className="font-mono text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Lote: {a.lotNumber}</span>}
                    {a.alertType && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded font-medium">{a.alertType}</span>}
                  </div>
                  <p className="text-sm text-red-700">{a.reason}</p>
                  {a.blockedAt && <p className="text-xs text-red-500 mt-1">Bloqueado em: {new Date(a.blockedAt).toLocaleDateString('pt-BR')}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'reacoes' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Reações Adversas Registradas</h2>
          {reactions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhuma reação adversa registrada.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Paciente</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Medicamento</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Reação</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Severidade</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Início</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reactions.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.patientId ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.medicationName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.reactionDesc ?? r.description ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.severity === 'GRAVE' || r.severity === 'FATAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{r.severity ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.onsetAt ? new Date(r.onsetAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'protocolos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Protocolos de Medicamentos</h2>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
            <FlaskConical className="h-4 w-4 inline mr-2" />
            Protocolos devem ser aprovados por responsável clínico habilitado antes de uso.
            O sistema auxilia a execução — não substitui julgamento clínico.
            Não invente dose, contraindicação, interação ou regra clínica.
          </div>
          {protocols.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Nenhum protocolo cadastrado para esta organização.
            </div>
          ) : (
            <div className="space-y-3">
              {protocols.map((p) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">{p.name}</span>
                      {p.code && <span className="ml-2 font-mono text-xs text-gray-500">{p.code}</span>}
                      {p.version && <span className="ml-2 text-xs text-gray-400">v{p.version}</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'APROVADO' ? 'bg-green-100 text-green-700' :
                      p.status === 'RASCUNHO' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                    }`}>{p.status ?? 'RASCUNHO'}</span>
                  </div>
                  {p.description && <p className="text-sm text-gray-600 mt-1">{p.description}</p>}
                  {p.requiresDualCheck && (
                    <p className="text-xs text-amber-700 mt-1 font-medium">⚠ Exige dupla checagem</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
