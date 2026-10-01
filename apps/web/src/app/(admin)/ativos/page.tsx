'use client';

import { useState } from 'react';
import { Wrench, Thermometer, Zap, AlertTriangle } from 'lucide-react';

type Tab = 'ativos' | 'manutencao' | 'esterilizacao' | 'cadeia-frio';

const STATUS_COLORS: Record<string, string> = {
  DISPONIVEL: 'bg-green-100 text-green-700',
  EM_USO: 'bg-blue-100 text-blue-700',
  EM_MANUTENCAO: 'bg-yellow-100 text-yellow-700',
  BLOQUEADO: 'bg-red-100 text-red-700',
  DESCARTADO: 'bg-gray-100 text-gray-500',
  CEDIDO: 'bg-purple-100 text-purple-700',
};

const MOCK_ASSETS = [
  { id: 'a1', name: 'Monitor Multiparâmetros', tag: 'EQP-001', category: 'Monitoração', status: 'DISPONIVEL', requiresCalibration: true, nextCalibrationAt: '2026-11-01', location: 'Sala 1' },
  { id: 'a2', name: 'Ventilador Mecânico', tag: 'EQP-002', category: 'UTI', status: 'EM_MANUTENCAO', requiresCalibration: true, nextCalibrationAt: '2026-10-15', location: 'UTI' },
  { id: 'a3', name: 'Geladeira de Vacinas', tag: 'EQP-003', category: 'Cadeia do Frio', status: 'DISPONIVEL', requiresColdChain: true, minTempC: 2, maxTempC: 8, location: 'Enfermagem' },
  { id: 'a4', name: 'Autoclave', tag: 'EQP-004', category: 'Esterilização', status: 'BLOQUEADO', blockedReason: 'Falha no manômetro', location: 'CME' },
];

const MOCK_MAINTENANCE = [
  { id: 'mo1', title: 'Revisão preventiva mensal', assetName: 'Ventilador Mecânico', type: 'PREVENTIVA', status: 'EM_EXECUCAO', scheduledAt: '2026-10-01' },
  { id: 'mo2', title: 'Calibração anual', assetName: 'Monitor Multiparâmetros', type: 'CALIBRACAO', status: 'SOLICITADA', scheduledAt: '2026-10-05' },
];

export default function AtivosPage() {
  const [tab, setTab] = useState<Tab>('ativos');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-6 w-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Ativos</h1>
          <p className="text-sm text-gray-500">M16 ATI — Equipamentos, manutenção, esterilização e cadeia do frio</p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ativos Disponíveis', value: 2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Em Manutenção', value: 1, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Bloqueados', value: 1, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Calibrações Vencidas', value: 1, color: 'text-orange-600', bg: 'bg-orange-50' },
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
          {(['ativos', 'manutencao', 'esterilizacao', 'cadeia-frio'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'ativos' ? 'Ativos' : t === 'manutencao' ? 'Manutenção' : t === 'esterilizacao' ? 'Esterilização' : 'Cadeia do Frio'}
            </button>
          ))}
        </nav>
      </div>

      {/* Ativos */}
      {tab === 'ativos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Cadastro de Ativos</h2>
            <button className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700">
              + Cadastrar Ativo
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Patrimônio</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Equipamento</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoria</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Localização</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Próx. Calibração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_ASSETS.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{a.tag}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{a.name}</span>
                      {(a as any).blockedReason && (
                        <span className="block text-xs text-red-600 mt-0.5">{(a as any).blockedReason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.category}</td>
                    <td className="px-4 py-3 text-gray-600">{a.location}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{(a as any).nextCalibrationAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manutenção */}
      {tab === 'manutencao' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Ordens de Manutenção</h2>
            <button className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700">
              + Nova Ordem
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Título</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Equipamento</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Agendado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_MAINTENANCE.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.title}</td>
                    <td className="px-4 py-3 text-gray-600">{m.assetName}</td>
                    <td className="px-4 py-3 text-gray-600">{m.type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.status === 'EM_EXECUCAO' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.scheduledAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Esterilização */}
      {tab === 'esterilizacao' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Ciclos de Esterilização</h2>
            <button className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700">
              + Registrar Ciclo
            </button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <Wrench className="h-4 w-4 inline mr-1" />
            Esterilização segue procedimento aprovado e versionado. A validação é de responsabilidade do profissional habilitado.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Nenhum ciclo registrado nos últimos 30 dias.
          </div>
        </div>
      )}

      {/* Cadeia do Frio */}
      {tab === 'cadeia-frio' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Monitoramento de Temperatura</h2>
            <button className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700">
              + Registrar Leitura
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <Thermometer className="h-4 w-4 inline mr-1" />
            Temperatura não é monitorada automaticamente sem sensor ou fonte de dados configurada.
            Excursões requerem avaliação humana — o sistema não libera nem descarta itens automaticamente.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Nenhuma leitura registrada. Configure o ativo com <strong>requiresColdChain: true</strong> e registre as leituras manualmente ou via importação.
          </div>
        </div>
      )}
    </div>
  );
}
