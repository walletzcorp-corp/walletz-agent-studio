'use client';

import { useState } from 'react';
import { ShieldCheck, AlertCircle, ClipboardList, BarChart3 } from 'lucide-react';

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

const MOCK_INCIDENTS = [
  { id: 'qi1', incidentType: 'QUASE_FALHA', title: 'Troca de medicamento evitada', status: 'EM_ANALISE', occurredAt: '2026-10-01T09:00:00Z', isAnonymous: false, reportedBy: 'Enf. Ana' },
  { id: 'qi2', incidentType: 'INCIDENTE_SEM_DANO', title: 'Queda sem lesão no corredor', status: 'EM_ACAO', occurredAt: '2026-10-01T14:30:00Z', isAnonymous: true, reportedBy: null },
];

const MOCK_ACTIONS = [
  { id: 'ap1', title: 'Implantação de double-check para medicamentos de alto risco', status: 'EM_ANDAMENTO', dueDate: '2026-10-15', responsibleId: 'user-2', actionType: 'CORRETIVA' },
  { id: 'ap2', title: 'Revisão do protocolo de prevenção de quedas', status: 'PENDENTE', dueDate: '2026-10-30', responsibleId: 'user-3', actionType: 'PREVENTIVA' },
];

export default function QualidadePage() {
  const [tab, setTab] = useState<Tab>('incidentes');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qualidade e Segurança do Paciente</h1>
          <p className="text-sm text-gray-500">M15 QUA — Incidentes, análise de causa, ações corretivas, indicadores</p>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Incidentes Abertos', value: 2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Em Análise', value: 1, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Ações Pendentes', value: 2, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Encerrados (30d)', value: 5, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
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

      {/* Incidentes */}
      {tab === 'incidentes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Notificações de Incidentes</h2>
            <div className="flex gap-2">
              <button className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
                Relato Anônimo
              </button>
              <button className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700">
                + Notificar Incidente
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {MOCK_INCIDENTS.map((i) => (
              <div key={i.id} className={`border rounded-xl p-4 ${TYPE_COLORS[i.incidentType] ?? 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium bg-white px-2 py-0.5 rounded border border-gray-200">
                        {TYPE_LABELS[i.incidentType]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[i.status]}`}>
                        {i.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">{i.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ocorrido: {new Date(i.occurredAt).toLocaleString('pt-BR')}
                      {' · '}
                      {i.isAnonymous ? 'Relato anônimo' : `Notificado por: ${i.reportedBy}`}
                    </p>
                  </div>
                  <button className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-white">
                    Analisar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planos de Ação */}
      {tab === 'acoes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Planos de Ação Corretiva/Preventiva</h2>
            <button className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700">
              + Novo Plano
            </button>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Ação corretiva só pode ser encerrada com evidência e verificação de efetividade por responsável.
          </div>
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
                {MOCK_ACTIONS.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                    <td className="px-4 py-3 text-gray-600">{a.actionType}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.status === 'PENDENTE' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.dueDate}</td>
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
            <h2 className="text-lg font-semibold text-gray-800">Protocolos e Políticas de Qualidade</h2>
            <button className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700">
              + Novo Protocolo
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            Nenhum protocolo cadastrado.
            <br />
            <button className="mt-3 text-green-600 text-sm hover:underline">Criar primeiro protocolo</button>
          </div>
        </div>
      )}

      {/* Indicadores */}
      {tab === 'indicadores' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Indicadores de Qualidade</h2>
            <button className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700">
              + Novo Indicador
            </button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <BarChart3 className="h-4 w-4 inline mr-1" />
            Evite métricas que incentivem subnotificação de incidentes. A cultura de segurança depende do relato livre e confiável.
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Nenhum indicador cadastrado.
            <br />
            <button className="mt-3 text-green-600 text-sm hover:underline">Criar primeiro indicador</button>
          </div>
        </div>
      )}
    </div>
  );
}
