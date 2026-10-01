'use client';

import { useState } from 'react';

const TABS = ['pedidos', 'amostras', 'resultados', 'worklist'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  pedidos: 'Pedidos',
  amostras: 'Amostras',
  resultados: 'Resultados',
  worklist: 'Worklist',
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  SOLICITADO: 'bg-blue-100 text-blue-700',
  COLETADO: 'bg-indigo-100 text-indigo-700',
  EM_ANALISE: 'bg-yellow-100 text-yellow-700',
  RESULTADO_PARCIAL: 'bg-orange-100 text-orange-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
};

const SAMPLE_STATUS_COLOR: Record<string, string> = {
  COLETADA: 'bg-blue-100 text-blue-700',
  RECEBIDA: 'bg-indigo-100 text-indigo-700',
  EM_PROCESSAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDA: 'bg-green-100 text-green-700',
  REJEITADA: 'bg-red-100 text-red-700',
};

const RESULT_STATUS_COLOR: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-500',
  LIBERADO: 'bg-green-100 text-green-700',
  RETIFICADO: 'bg-orange-100 text-orange-700',
};

const mockOrders = [
  { id: 'o1', patientId: 'PAC-001', examCode: 'HMG', examName: 'Hemograma Completo', examType: 'LAB', status: 'CONCLUIDO', requestedAt: '2026-10-01' },
  { id: 'o2', patientId: 'PAC-002', examCode: 'RX-TX', examName: 'Radiografia de Tórax', examType: 'IMAGEM', status: 'COLETADO', requestedAt: '2026-10-01' },
  { id: 'o3', patientId: 'PAC-003', examCode: 'PCR', examName: 'Proteína C-Reativa', examType: 'LAB', status: 'EM_ANALISE', requestedAt: '2026-09-30' },
];

const mockSamples = [
  { id: 's1', orderId: 'o1', barcode: 'BC-20261001-001', sampleType: 'SANGUE', status: 'CONCLUIDA', collectedAt: '2026-10-01T08:10:00' },
  { id: 's2', orderId: 'o3', barcode: 'BC-20260930-002', sampleType: 'SANGUE', status: 'EM_PROCESSAMENTO', collectedAt: '2026-09-30T14:22:00' },
  { id: 's3', orderId: 'o2', barcode: 'BC-20261001-003', sampleType: 'OUTRO', status: 'RECEBIDA', collectedAt: '2026-10-01T09:00:00' },
];

const mockResults = [
  { id: 'res1', orderId: 'o1', version: 1, status: 'LIBERADO', isCritical: false, releasedAt: '2026-10-01T10:00:00', resultSummary: 'Hemoglobina 13.5 g/dL, Leucócitos 7.500/mm³' },
  { id: 'res2', orderId: 'o3', version: 1, status: 'RASCUNHO', isCritical: true, releasedAt: null, resultSummary: 'PCR > 200 mg/L — aguardando ciência' },
];

export default function DiagnosticoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pedidos');

  const criticalUnacked = mockResults.filter(r => r.isCritical && !r.releasedAt).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">M19 — Laboratório e Diagnóstico por Imagem</h1>
        <p className="text-sm text-gray-500 mt-1">Pedidos, amostras, resultados e rastreabilidade de exames</p>
      </div>

      {criticalUnacked > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <span className="text-red-600 text-lg">⚠</span>
          <div>
            <p className="font-semibold text-red-800">{criticalUnacked} resultado(s) crítico(s) aguardando ciência</p>
            <p className="text-xs text-red-600 mt-0.5">Resultado crítico requer destinatário responsável, prazo e registro de comunicação confirmado.</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Pedidos Hoje</div>
          <div className="text-2xl font-bold text-blue-600">{mockOrders.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Amostras em Processamento</div>
          <div className="text-2xl font-bold text-yellow-600">{mockSamples.filter(s => s.status === 'EM_PROCESSAMENTO').length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Resultados Liberados</div>
          <div className="text-2xl font-bold text-green-600">{mockResults.filter(r => r.status === 'LIBERADO').length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Críticos s/ Ciência</div>
          <div className={`text-2xl font-bold ${criticalUnacked > 0 ? 'text-red-600' : 'text-green-600'}`}>{criticalUnacked}</div>
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

      {activeTab === 'pedidos' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Exame</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Solicitado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{o.patientId}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.examName}</div>
                    <div className="text-xs text-gray-400 font-mono">{o.examCode}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{o.examType}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLOR[o.status] ?? ''}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{o.requestedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'amostras' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Código de Barras</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pedido</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Coleta</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockSamples.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.barcode}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.orderId}</td>
                  <td className="px-4 py-3 text-gray-600">{s.sampleType}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${SAMPLE_STATUS_COLOR[s.status] ?? ''}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.collectedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'resultados' && (
        <div className="space-y-3">
          {mockResults.map(r => (
            <div key={r.id} className={`bg-white rounded-lg border p-4 ${r.isCritical ? 'border-red-300' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-500">Pedido {r.orderId}</span>
                    <span className="text-xs text-gray-400">v{r.version}</span>
                    {r.isCritical && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-medium">CRÍTICO</span>}
                  </div>
                  <p className="text-sm text-gray-800">{r.resultSummary}</p>
                  {r.releasedAt && <p className="text-xs text-gray-400 mt-1">Liberado em: {r.releasedAt}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${RESULT_STATUS_COLOR[r.status] ?? ''}`}>{r.status}</span>
              </div>
              {r.isCritical && !r.releasedAt && (
                <p className="text-xs text-red-600 mt-2">Aguardando ciência formal — não marcar como concluído sem confirmação observável.</p>
              )}
              <p className="text-xs text-gray-400 mt-2">O sistema registra pedidos e resultados — não interpreta exame nem oferece diagnóstico autônomo.</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'worklist' && (
        <div className="bg-white rounded-lg border p-6 text-center text-gray-400">
          <p className="text-2xl mb-2">🔬</p>
          <p className="font-medium">Worklist de análise</p>
          <p className="text-sm mt-1">Integração RIS/PACS requer provedor, ambiente e dispositivo configurados.</p>
        </div>
      )}
    </div>
  );
}
