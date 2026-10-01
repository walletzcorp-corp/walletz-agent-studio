'use client';

import { useState } from 'react';

const TABS = ['templates', 'versoes', 'automacoes', 'simulacoes'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  templates: 'Templates',
  versoes: 'Versões',
  automacoes: 'Automações',
  simulacoes: 'Simulações',
};

const VERSION_STATUS_COLOR: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-500',
  AGUARDANDO_APROVACAO: 'bg-yellow-100 text-yellow-700',
  APROVADO: 'bg-blue-100 text-blue-700',
  PUBLICADO: 'bg-green-100 text-green-700',
  RETIRADO: 'bg-red-100 text-red-500',
};

const AUTOMATION_STATUS_COLOR: Record<string, string> = {
  ATIVO: 'bg-green-100 text-green-700',
  PAUSADO: 'bg-yellow-100 text-yellow-700',
  INATIVO: 'bg-gray-100 text-gray-500',
};

const mockTemplates = [
  { id: 'tpl1', name: 'Anamnese Geral', templateType: 'FORMULARIO', publishedVersionId: 'v2', createdAt: '2026-09-10', versionsCount: 3 },
  { id: 'tpl2', name: 'Triagem COVID-19', templateType: 'PROTOCOLO', publishedVersionId: null, createdAt: '2026-09-20', versionsCount: 1 },
  { id: 'tpl3', name: 'Consentimento Cirúrgico', templateType: 'CONSENTIMENTO', publishedVersionId: 'v1', createdAt: '2026-08-15', versionsCount: 2 },
];

const mockVersions = [
  { id: 'v1', templateId: 'tpl3', templateName: 'Consentimento Cirúrgico', versionNumber: 1, status: 'PUBLICADO', createdBy: 'Dr. Santos', approvedBy: 'Dr. Diretor', publishedAt: '2026-09-01' },
  { id: 'v2', templateId: 'tpl1', templateName: 'Anamnese Geral', versionNumber: 2, status: 'PUBLICADO', createdBy: 'Enf. Silva', approvedBy: 'Dr. Costa', publishedAt: '2026-09-15' },
  { id: 'v3', templateId: 'tpl2', templateName: 'Triagem COVID-19', versionNumber: 1, status: 'AGUARDANDO_APROVACAO', createdBy: 'Dr. Lima', approvedBy: null, publishedAt: null },
];

const mockAutomations = [
  { id: 'a1', name: 'Alerta pós-consulta', triggerEvent: 'appointment.completed', status: 'ATIVO', maxExecutions: 100, executionCount: 23 },
  { id: 'a2', name: 'Lembrete de retorno', triggerEvent: 'patient.no_show', status: 'PAUSADO', maxExecutions: 50, executionCount: 12 },
];

const mockSimulations = [
  { id: 'sim1', versionId: 'v2', passed: true, runAt: '2026-09-14T15:00:00', errors: [] },
  { id: 'sim2', versionId: 'v3', passed: false, runAt: '2026-09-20T10:30:00', errors: ['Campo obrigatório "nome" ausente'] },
];

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<Tab>('templates');

  const publishedTemplates = mockTemplates.filter(t => t.publishedVersionId).length;
  const pendingApproval = mockVersions.filter(v => v.status === 'AGUARDANDO_APROVACAO').length;
  const activeAutomations = mockAutomations.filter(a => a.status === 'ATIVO').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">M20 — Studio No-code e Automação</h1>
        <p className="text-sm text-gray-500 mt-1">Templates, versionamento, automações e simulações configuráveis</p>
      </div>

      {pendingApproval > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="font-medium text-yellow-800">{pendingApproval} versão(ões) aguardando aprovação</p>
          <p className="text-xs text-yellow-600 mt-0.5">Versões publicadas exigem autor, aprovador, vigência e histórico imutável.</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Templates</div>
          <div className="text-2xl font-bold text-blue-600">{mockTemplates.length}</div>
          <div className="text-xs text-gray-400">{publishedTemplates} publicado(s)</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Versões Ativas</div>
          <div className="text-2xl font-bold text-green-600">{mockVersions.filter(v => v.status === 'PUBLICADO').length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Automações Ativas</div>
          <div className="text-2xl font-bold text-purple-600">{activeAutomations}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Aguard. Aprovação</div>
          <div className={`text-2xl font-bold ${pendingApproval > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>{pendingApproval}</div>
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

      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Versões</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Publicado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Criado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockTemplates.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.templateType}</td>
                  <td className="px-4 py-3 text-center">{t.versionsCount}</td>
                  <td className="px-4 py-3">
                    {t.publishedVersionId
                      ? <span className="text-green-700 font-medium">✓ Sim</span>
                      : <span className="text-gray-400">Não</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'versoes' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Template</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Versão</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Criado por</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aprovado por</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Publicação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockVersions.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{v.templateName}</td>
                  <td className="px-4 py-3 text-center font-mono">v{v.versionNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{v.createdBy}</td>
                  <td className="px-4 py-3 text-gray-600">{v.approvedBy ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${VERSION_STATUS_COLOR[v.status] ?? ''}`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.publishedAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-3 border-t">Mudança em protocolo não altera retroativamente registros já iniciados ou concluídos.</p>
        </div>
      )}

      {activeTab === 'automacoes' && (
        <div className="space-y-3">
          {mockAutomations.map(a => (
            <div key={a.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{a.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Gatilho: <span className="font-mono">{a.triggerEvent}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Execuções: {a.executionCount} / {a.maxExecutions} máx.</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${AUTOMATION_STATUS_COLOR[a.status] ?? ''}`}>{a.status}</span>
              </div>
            </div>
          ))}
          <p className="text-xs text-amber-600 px-1">Automações possuem limite de execuções e botão de interrupção para evitar loops em cascata.</p>
        </div>
      )}

      {activeTab === 'simulacoes' && (
        <div className="space-y-3">
          {mockSimulations.map(s => (
            <div key={s.id} className={`bg-white rounded-lg border p-4 ${s.passed ? 'border-green-200' : 'border-red-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={s.passed ? 'text-green-600' : 'text-red-600'}>{s.passed ? '✓ PASSOU' : '✗ FALHOU'}</span>
                <span className="text-xs font-mono text-gray-400">Versão {s.versionId}</span>
                <span className="text-xs text-gray-400">{s.runAt}</span>
              </div>
              {s.errors.length > 0 && (
                <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                  {s.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 px-1">Simulações usam apenas dados fictícios — nunca dados reais de pacientes.</p>
        </div>
      )}
    </div>
  );
}
