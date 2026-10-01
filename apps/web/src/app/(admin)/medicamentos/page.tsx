'use client';

import { useState } from 'react';
import { Pill, ShieldAlert, FlaskConical, AlertTriangle } from 'lucide-react';

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

const MOCK_RECORDS = [
  { id: 'r1', patientId: 'PAC-001', medicationName: 'Dipirona 500mg', dose: 500, doseUnit: 'mg', route: 'ORAL', status: 'ADMINISTRADO', scheduledAt: '2026-10-01T10:00:00Z', administeredBy: 'Enf. Ana' },
  { id: 'r2', patientId: 'PAC-002', medicationName: 'Metronidazol 500mg', dose: 500, doseUnit: 'mg', route: 'EV', status: 'PREPARADO', scheduledAt: '2026-10-01T12:00:00Z', administeredBy: null },
  { id: 'r3', patientId: 'PAC-003', medicationName: 'Amoxicilina 250mg', dose: 250, doseUnit: 'mg', route: 'ORAL', status: 'RESERVADO', scheduledAt: '2026-10-01T14:00:00Z', administeredBy: null },
];

const MOCK_ALERTS = [
  { id: 'a1', lotNumber: 'LOT-XYZ', medicationName: 'Ibuprofeno 400mg', alertType: 'RECOLHIMENTO', reason: 'ANVISA — Recall voluntário do fabricante', active: true, blockedAt: '2026-09-28' },
];

const MOCK_REACTIONS = [
  { id: 'ar1', patientId: 'PAC-001', medicationName: 'Amoxicilina', reactionDesc: 'Urticária generalizada', severity: 'MODERADA', onsetAt: '2026-10-01T11:30:00Z' },
];

export default function MedicamentosPage() {
  const [tab, setTab] = useState<Tab>('registros');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Pill className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Segurança de Medicamentos</h1>
          <p className="text-sm text-gray-500">M14 MED — Administração, dupla checagem, rastreabilidade de lotes</p>
        </div>
      </div>

      {/* Aviso de segurança */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Regras de segurança obrigatórias:</strong> Confirme o paciente com dois identificadores antes de administrar.
          Verifique lote, validade e alergias. Protocolo com dupla checagem exige dois profissionais distintos.
          Registros administrados não podem ser apagados — correções geram adendo auditável.
        </div>
      </div>

      {/* Tabs */}
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

      {/* Registros de Administração */}
      {tab === 'registros' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Registros do Dia</h2>
            <button className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
              + Novo Registro
            </button>
          </div>
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
                {MOCK_RECORDS.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.patientId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.medicationName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.dose}{r.doseUnit} — {r.route}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.administeredBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alertas de Lote */}
      {tab === 'lotes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Alertas de Lote Ativos</h2>
            <button className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700">
              + Bloquear Lote
            </button>
          </div>
          {MOCK_ALERTS.map((a) => (
            <div key={a.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-red-800">{a.medicationName}</span>
                  <span className="font-mono text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Lote: {a.lotNumber}</span>
                  <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded font-medium">{a.alertType}</span>
                </div>
                <p className="text-sm text-red-700">{a.reason}</p>
                <p className="text-xs text-red-500 mt-1">Bloqueado em: {a.blockedAt}</p>
              </div>
              <button className="text-sm text-red-700 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100">
                Resolver
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reações Adversas */}
      {tab === 'reacoes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Reações Adversas Registradas</h2>
            <button className="bg-orange-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-700">
              + Registrar Reação
            </button>
          </div>
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
                {MOCK_REACTIONS.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.patientId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.medicationName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.reactionDesc}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.severity === 'GRAVE' || r.severity === 'FATAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{r.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.onsetAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Protocolos */}
      {tab === 'protocolos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Protocolos de Medicamentos</h2>
            <button className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
              + Novo Protocolo
            </button>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
            <FlaskConical className="h-4 w-4 inline mr-2" />
            Protocolos devem ser aprovados por responsável clínico habilitado antes de uso.
            O sistema auxilia a execução — não substitui julgamento clínico.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Nenhum protocolo cadastrado para esta organização.
            <br />
            <button className="mt-3 text-indigo-600 text-sm hover:underline">Criar primeiro protocolo</button>
          </div>
        </div>
      )}
    </div>
  );
}
