'use client';

import { useState } from 'react';

const TABS = ['perfil', 'encaminhamentos', 'avaliacoes', 'parceiros', 'campanhas'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  perfil: 'Perfil Público',
  encaminhamentos: 'Encaminhamentos',
  avaliacoes: 'Avaliações',
  parceiros: 'Parceiros',
  campanhas: 'Campanhas',
};

const REFERRAL_STATUS_COLOR: Record<string, string> = {
  ENVIADO: 'bg-blue-100 text-blue-800',
  ACEITO: 'bg-green-100 text-green-800',
  RECUSADO: 'bg-red-100 text-red-800',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-800',
  CONCLUIDO: 'bg-gray-100 text-gray-700',
  CANCELADO: 'bg-red-50 text-red-600',
};

const REVIEW_STATUS_COLOR: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  PUBLICADO: 'bg-green-100 text-green-800',
  OCULTADO: 'bg-gray-100 text-gray-500',
  REMOVIDO: 'bg-red-100 text-red-700',
};

const mockReferrals = [
  { id: 'r1', patientId: 'PAC-001', reason: 'Avaliação cardiológica', destOrgId: 'Hospital Central', status: 'ENVIADO', priority: 'ALTA', createdAt: '2026-10-01' },
  { id: 'r2', patientId: 'PAC-002', reason: 'Ortopedia — joelho', destOrgId: 'Clínica Ortopédica Sul', status: 'ACEITO', priority: 'MEDIA', createdAt: '2026-09-29' },
  { id: 'r3', patientId: 'PAC-003', reason: 'Acompanhamento nutrição', destProfId: 'Dr. Ribeiro', status: 'CONCLUIDO', priority: 'BAIXA', createdAt: '2026-09-25' },
];

const mockReviews = [
  { id: 'rv1', rating: 5, comment: 'Atendimento excelente, muito atencioso.', status: 'PUBLICADO', createdAt: '2026-10-01' },
  { id: 'rv2', rating: 3, comment: 'Espera um pouco longa, mas bom atendimento.', status: 'PENDENTE', createdAt: '2026-09-30' },
  { id: 'rv3', rating: 4, comment: 'Ótima equipe.', status: 'PENDENTE', createdAt: '2026-09-28' },
];

const mockPartners = [
  { id: 'pt1', partnerName: 'Laboratório Biodados', partnerType: 'LABORATORIO', verified: true, createdAt: '2026-09-15' },
  { id: 'pt2', partnerName: 'Imagem Diagnóstica Sul', partnerType: 'IMAGEM', verified: false, createdAt: '2026-09-20' },
];

const mockCampaigns = [
  { id: 'c1', title: 'Semana da Saúde Bucal', campaignType: 'EDUCATIVO', active: true, createdAt: '2026-09-28' },
  { id: 'c2', title: 'Retorno pós-consulta', campaignType: 'ASSISTENCIAL', active: true, createdAt: '2026-09-20' },
];

export default function EngajamentoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const avgRating = mockReviews.filter(r => r.status === 'PUBLICADO').reduce((a, r) => a + r.rating, 0) || 0;
  const publishedCount = mockReviews.filter(r => r.status === 'PUBLICADO').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">M18 — Engajamento, Referência e Reputação</h1>
        <p className="text-sm text-gray-500 mt-1">Gestão de perfil público, encaminhamentos, avaliações, parceiros e campanhas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Média de Avaliações</div>
          <div className="text-2xl font-bold text-yellow-600">{publishedCount > 0 ? (avgRating / publishedCount).toFixed(1) : '—'} ★</div>
          <div className="text-xs text-gray-400">{publishedCount} publicada(s)</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Encaminhamentos Abertos</div>
          <div className="text-2xl font-bold text-blue-600">{mockReferrals.filter(r => !['CONCLUIDO', 'CANCELADO'].includes(r.status)).length}</div>
          <div className="text-xs text-gray-400">de {mockReferrals.length} total</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Parceiros Verificados</div>
          <div className="text-2xl font-bold text-green-600">{mockPartners.filter(p => p.verified).length}</div>
          <div className="text-xs text-gray-400">de {mockPartners.length} total</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 mb-1">Campanhas Ativas</div>
          <div className="text-2xl font-bold text-purple-600">{mockCampaigns.filter(c => c.active).length}</div>
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

      {/* Tab Panels */}
      {activeTab === 'perfil' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Perfil Público da Organização</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Slug / URL pública:</span> <span className="font-mono text-blue-700">clinica-walletz</span></div>
            <div><span className="text-gray-500">Nome de exibição:</span> <span className="font-medium">Clínica Walletz</span></div>
            <div><span className="text-gray-500">Especialidades:</span> <span>Clínica Geral, Cardiologia, Ortopedia</span></div>
            <div><span className="text-gray-500">Aceita novos pacientes:</span> <span className="text-green-700 font-medium">Sim</span></div>
          </div>
          <p className="text-xs text-amber-600 mt-4">Respostas públicas a avaliações não podem revelar relação clínica ou dados de saúde do paciente.</p>
        </div>
      )}

      {activeTab === 'encaminhamentos' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prioridade</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockReferrals.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.patientId}</td>
                  <td className="px-4 py-3">{r.reason}</td>
                  <td className="px-4 py-3 text-gray-600">{r.destOrgId || r.destProfId}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.priority === 'ALTA' ? 'bg-red-100 text-red-700' : r.priority === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${REFERRAL_STATUS_COLOR[r.status] ?? ''}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'avaliacoes' && (
        <div className="space-y-3">
          {mockReviews.map(rv => (
            <div key={rv.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-yellow-500 text-lg">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</div>
                  <p className="text-sm text-gray-700 mt-1">{rv.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">{rv.createdAt}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${REVIEW_STATUS_COLOR[rv.status] ?? ''}`}>{rv.status}</span>
              </div>
              {rv.status === 'PENDENTE' && (
                <p className="text-xs text-amber-600 mt-2">Aguardando revisão — respostas devem ser aprovadas antes da publicação.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'parceiros' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Parceiro</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Verificado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockPartners.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.partnerName}</td>
                  <td className="px-4 py-3 text-gray-600">{p.partnerType}</td>
                  <td className="px-4 py-3">
                    {p.verified
                      ? <span className="text-green-700 font-medium">✓ Verificado</span>
                      : <span className="text-gray-400">Pendente</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'campanhas' && (
        <div className="space-y-3">
          {mockCampaigns.map(c => (
            <div key={c.id} className="bg-white rounded-lg border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">Cadastro: {c.createdAt}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.campaignType === 'EDUCATIVO' ? 'bg-blue-100 text-blue-700' : c.campaignType === 'ASSISTENCIAL' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {c.campaignType}
                </span>
                {c.active && <span className="w-2 h-2 rounded-full bg-green-500" title="Ativa" />}
              </div>
            </div>
          ))}
          <p className="text-xs text-amber-600 px-1">Conteúdo educativo, comunicação assistencial e publicidade comercial são mantidos separados.</p>
        </div>
      )}
    </div>
  );
}
