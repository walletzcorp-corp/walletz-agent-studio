'use client';

import { useState } from 'react';

const TABS = ['jobs', 'healthscore', 'tickets', 'acessos'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  jobs: 'Jobs de Migração',
  healthscore: 'Health Score',
  tickets: 'Suporte',
  acessos: 'Acessos Temporários',
};

const JOB_STATUS_COLOR: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-500',
  VALIDADO: 'bg-blue-100 text-blue-700',
  APROVADO: 'bg-indigo-100 text-indigo-700',
  EXECUTANDO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  REVERTIDO: 'bg-orange-100 text-orange-700',
  CANCELADO: 'bg-red-100 text-red-500',
};

const TICKET_STATUS_COLOR: Record<string, string> = {
  ABERTO: 'bg-blue-100 text-blue-700',
  EM_ATENDIMENTO: 'bg-yellow-100 text-yellow-700',
  AGUARDANDO_CLIENTE: 'bg-orange-100 text-orange-700',
  RESOLVIDO: 'bg-green-100 text-green-700',
  FECHADO: 'bg-gray-100 text-gray-500',
};

const mockJobs = [
  { id: 'j1', name: 'Pacientes CSV — Legado 2019', sourceFormat: 'CSV', targetModule: 'PAC', status: 'CONCLUIDO', totalRows: 3420, validRows: 3398, approvedBy: 'Dr. Admin', rollbackAvailable: false, createdAt: '2026-09-28' },
  { id: 'j2', name: 'Histórico de Agendamentos', sourceFormat: 'JSON', targetModule: 'AGD', status: 'APROVADO', totalRows: 15000, validRows: 14987, approvedBy: 'Dr. Admin', rollbackAvailable: true, createdAt: '2026-10-01' },
  { id: 'j3', name: 'Prontuários PDF', sourceFormat: 'PDF', targetModule: 'PEP', status: 'VALIDADO', totalRows: 820, validRows: 810, approvedBy: null, rollbackAvailable: false, createdAt: '2026-10-01' },
];

const mockHealthScores = [
  { id: 'hs1', scoreDate: '2026-10-01', implantationScore: 95, adoptionScore: 72, securityScore: 88, operationScore: 80, overallScore: 83.75 },
  { id: 'hs2', scoreDate: '2026-09-01', implantationScore: 80, adoptionScore: 60, securityScore: 85, operationScore: 75, overallScore: 75.0 },
];

const mockTickets = [
  { id: 't1', title: 'Erro ao importar pacientes com CPF inválido', priority: 'ALTA', status: 'EM_ATENDIMENTO', createdAt: '2026-10-01' },
  { id: 't2', title: 'Dúvida sobre mapeamento de campos', priority: 'MEDIA', status: 'RESOLVIDO', createdAt: '2026-09-29' },
];

const mockGrants = [
  { id: 'ag1', grantedTo: 'suporte@walletz.com', scope: 'read:migrations', reason: 'Debug de importação', expiresAt: '2026-10-03T18:00:00', revokedAt: null, maskingEnabled: true },
  { id: 'ag2', grantedTo: 'consultor@parceiro.com', scope: 'read:all', reason: 'Onboarding técnico', expiresAt: '2026-10-02T12:00:00', revokedAt: '2026-10-01T09:00:00', maskingEnabled: true },
];

function ScoreBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

export default function MigracaoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('jobs');

  const executingJobs = mockJobs.filter(j => j.status === 'EXECUTANDO').length;
  const openTickets = mockTickets.filter(t => !['RESOLVIDO', 'FECHADO'].includes(t.status)).length;
  const activeGrants = mockGrants.filter(g => !g.revokedAt).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">M21 — Migração, Onboarding e Suporte</h1>
        <p className="text-sm text-gray-500 mt-1">Jobs de importação, health score de implantação, tickets e acessos temporários</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Jobs de Migração</div>
          <div className="text-2xl font-bold text-blue-600">{mockJobs.length}</div>
          <div className="text-xs text-gray-400">{executingJobs} executando</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Health Score Atual</div>
          <div className="text-2xl font-bold text-green-600">{mockHealthScores[0]?.overallScore.toFixed(0) ?? '—'}</div>
          <div className="text-xs text-gray-400">de 100</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Tickets Abertos</div>
          <div className={`text-2xl font-bold ${openTickets > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{openTickets}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Acessos Temporários</div>
          <div className={`text-2xl font-bold ${activeGrants > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{activeGrants}</div>
          <div className="text-xs text-gray-400">ativos</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === tab
                  ? 'bg-white border border-b-white -mb-px text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'jobs' && (
        <div className="space-y-3">
          {mockJobs.map(j => (
            <div key={j.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{j.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Formato: {j.sourceFormat} → Módulo: {j.targetModule}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Total: {j.totalRows.toLocaleString()}</span>
                    <span className="text-green-600">Válidos: {j.validRows.toLocaleString()}</span>
                    <span className="text-red-500">Rejeitados: {(j.totalRows - j.validRows).toLocaleString()}</span>
                  </div>
                  {j.approvedBy && <p className="text-xs text-gray-400 mt-1">Aprovado por: {j.approvedBy}</p>}
                  {j.rollbackAvailable && <p className="text-xs text-orange-500 mt-1">⚠ Rollback disponível</p>}
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${JOB_STATUS_COLOR[j.status] ?? ''}`}>{j.status}</span>
                  <div className="text-xs text-gray-400 mt-1">{j.createdAt}</div>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-amber-600 px-1">Toda importação começa com validação e simulação — carga real requer aprovação explícita e aceite formal após reconciliação.</p>
        </div>
      )}

      {activeTab === 'healthscore' && (
        <div className="space-y-4">
          {mockHealthScores.map(hs => (
            <div key={hs.id} className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Health Score — {hs.scoreDate}</h3>
                <div className="text-2xl font-bold text-green-600">{hs.overallScore.toFixed(0)}</div>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between mb-1 text-gray-600"><span>Implantação</span></div>
                  <ScoreBar value={hs.implantationScore} />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-gray-600"><span>Adoção</span></div>
                  <ScoreBar value={hs.adoptionScore} />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-gray-600"><span>Segurança</span></div>
                  <ScoreBar value={hs.securityScore} />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-gray-600"><span>Operação</span></div>
                  <ScoreBar value={hs.operationScore} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prioridade</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Criado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockTickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.priority === 'ALTA' ? 'bg-red-100 text-red-700' : t.priority === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TICKET_STATUS_COLOR[t.status] ?? ''}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'acessos' && (
        <div className="space-y-3">
          {mockGrants.map(g => (
            <div key={g.id} className={`bg-white rounded-lg border p-4 ${g.revokedAt ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{g.grantedTo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Escopo: <span className="font-mono">{g.scope}</span></p>
                  <p className="text-xs text-gray-500">Motivo: {g.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">Expira: {g.expiresAt}</p>
                  {g.maskingEnabled && <p className="text-xs text-blue-600 mt-0.5">🔒 Mascaramento de dados ativo</p>}
                </div>
                {g.revokedAt
                  ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Revogado</span>
                  : <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Ativo</span>}
              </div>
            </div>
          ))}
          <p className="text-xs text-amber-600 px-1">Suporte temporário exige aprovação, prazo, escopo, mascaramento e auditoria. Revogação automática ao expirar.</p>
        </div>
      )}
    </div>
  );
}
