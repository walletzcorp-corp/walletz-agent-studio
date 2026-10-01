'use client';

import { useState } from 'react';
import { Users, Award, Calendar, AlertCircle } from 'lucide-react';

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

const MOCK_CREDENTIALS = [
  { id: 'c1', professionalId: 'PROF-001', professionalName: 'Dr. Carlos Mendes', credentialType: 'CRM', number: 'SP-98765', issuingBody: 'CFM', expiresAt: '2027-12-31', status: 'ATIVA' },
  { id: 'c2', professionalId: 'PROF-002', professionalName: 'Enf. Ana Paula', credentialType: 'COREN', number: '456789-SP', issuingBody: 'COFEN', expiresAt: '2026-06-30', status: 'VENCIDA' },
  { id: 'c3', professionalId: 'PROF-003', professionalName: 'Farm. Roberto Lima', credentialType: 'CRF', number: '12345/SP', issuingBody: 'CFF', expiresAt: '2028-03-15', status: 'ATIVA' },
];

const MOCK_SHIFTS = [
  { id: 's1', professionalName: 'Dr. Carlos Mendes', role: 'Médico Clínico', shiftStart: '2026-10-01T07:00:00Z', shiftEnd: '2026-10-01T19:00:00Z', status: 'EM_ANDAMENTO' },
  { id: 's2', professionalName: 'Enf. Ana Paula', role: 'Enfermeiro(a)', shiftStart: '2026-10-01T07:00:00Z', shiftEnd: '2026-10-01T19:00:00Z', status: 'AGENDADO' },
  { id: 's3', professionalName: 'Farm. Roberto Lima', role: 'Farmacêutico(a)', shiftStart: '2026-10-01T08:00:00Z', shiftEnd: '2026-10-01T17:00:00Z', status: 'AGENDADO' },
];

export default function EquipePage() {
  const [tab, setTab] = useState<Tab>('credenciais');

  const expiredCount = MOCK_CREDENTIALS.filter(c => c.status === 'VENCIDA').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-violet-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipe</h1>
          <p className="text-sm text-gray-500">M17 EQP — Credenciais, competências, escalas e turnos</p>
        </div>
      </div>

      {/* Alertas */}
      {expiredCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <strong>{expiredCount} credencial(is) vencida(s)</strong> — revise e atualize antes do próximo atendimento.
            Habilitação clínica não deve ser inferida pela função cadastrada; exija credencial verificável.
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Credenciais Ativas', value: 2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Credenciais Vencidas', value: 1, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Turnos Hoje', value: 3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Escalas Ativas', value: 1, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((c) => (
          <div key={c.label} className={`${c.bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
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

      {/* Credenciais */}
      {tab === 'credenciais' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Credenciais e Registros Profissionais</h2>
            <button className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700">
              + Registrar Credencial
            </button>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
            <Award className="h-4 w-4 inline mr-1" />
            Não infira habilitação clínica pela função cadastrada. Alterações de credencial geram auditoria automática.
          </div>
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
                {MOCK_CREDENTIALS.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.professionalName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{c.credentialType}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.number}</td>
                    <td className="px-4 py-3 text-gray-600">{c.issuingBody}</td>
                    <td className="px-4 py-3 text-gray-600">{c.expiresAt}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CREDENTIAL_STATUS_COLORS[c.status]}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Competências */}
      {tab === 'competencias' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Competências e Habilitações</h2>
            <button className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700">
              + Registrar Competência
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Nenhuma competência cadastrada.
            <br />
            <button className="mt-3 text-violet-600 text-sm hover:underline">Cadastrar primeira competência</button>
          </div>
        </div>
      )}

      {/* Escalas */}
      {tab === 'escalas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Escalas de Trabalho</h2>
            <button className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700">
              + Nova Escala
            </button>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
            <Calendar className="h-4 w-4 inline mr-1" />
            Escalas impedem conflitos óbvios de horário. Histórico de alterações é preservado. Comunicação não expõe dados clínicos.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-800">Escala Outubro 2026</p>
            <p className="text-sm text-gray-500 mt-1">01/10 – 31/10/2026 · 3 turnos cadastrados</p>
          </div>
        </div>
      )}

      {/* Turnos */}
      {tab === 'turnos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Turnos de Hoje</h2>
            <button className="bg-violet-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-violet-700">
              + Adicionar Turno
            </button>
          </div>
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
                {MOCK_SHIFTS.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.professionalName}</td>
                    <td className="px-4 py-3 text-gray-600">{s.role}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(s.shiftStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(s.shiftEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SHIFT_STATUS_COLORS[s.status]}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
