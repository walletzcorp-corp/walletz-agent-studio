'use client';

import { useState } from 'react';

// IA é apoio; não substitui decisão clínica, não assina, não prescreve e não finaliza prontuário autonomamente.
// Todo conteúdo gerado deve ser rascunho até revisão humana explícita.

const RISK_COLORS: Record<string, string> = {
  BAIXO:       'bg-emerald-100 text-emerald-800',
  MEDIO:       'bg-yellow-100 text-yellow-800',
  ALTO:        'bg-orange-100 text-orange-800',
  INACEITAVEL: 'bg-red-100 text-red-800',
};

const MOCK_CONFIGS = [
  { useCase: 'ANAMNESE',       label: 'Apoio a Anamnese',      enabled: true,  risk: 'BAIXO',  provider: 'simulated', approved: true  },
  { useCase: 'SUMARIO_ALTA',   label: 'Resumo de Alta',        enabled: true,  risk: 'MEDIO',  provider: 'simulated', approved: true  },
  { useCase: 'PRESCRICAO',     label: 'Sugestão de Prescrição', enabled: false, risk: 'ALTO',   provider: 'simulated', approved: false },
  { useCase: 'TRIAGEM',        label: 'Triagem Pré-Consulta',  enabled: false, risk: 'MEDIO',  provider: 'simulated', approved: false },
];

const MOCK_DRAFTS = [
  { id: 'd1', useCase: 'ANAMNESE', status: 'PENDENTE', inputSummary: 'Paciente, 45 anos, febre há 3 dias...', createdAt: '2026-10-01 08:30' },
  { id: 'd2', useCase: 'SUMARIO_ALTA', status: 'ACEITO',   inputSummary: 'Alta após colecistectomia laparoscópica...', createdAt: '2026-10-01 07:00' },
  { id: 'd3', useCase: 'ANAMNESE', status: 'REJEITADO', inputSummary: 'Criança, 7 anos, dor abdominal...', createdAt: '2026-09-30 14:15' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDENTE:  'bg-yellow-100 text-yellow-800',
  ACEITO:    'bg-emerald-100 text-emerald-800',
  REJEITADO: 'bg-red-100 text-red-800',
  EXPIRADO:  'bg-gray-100 text-gray-500',
};

export default function IaPage() {
  const [configs, setConfigs] = useState(MOCK_CONFIGS);
  const [drafts, setDrafts] = useState(MOCK_DRAFTS);
  const [tab, setTab] = useState<'configs' | 'drafts'>('configs');

  function toggleConfig(useCase: string) {
    setConfigs(prev => prev.map(c => c.useCase === useCase ? { ...c, enabled: !c.enabled } : c));
  }

  function reviewDraft(id: string, action: 'ACEITO' | 'REJEITADO') {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: action } : d));
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IA Clínica</h1>
        <p className="text-sm text-gray-500 mt-1">
          Módulo 11 (IA) — Governança, rascunhos e qualidade
        </p>
      </div>

      {/* Aviso obrigatório */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
        <strong>Aviso obrigatório:</strong> IA é apoio; não substitui decisão clínica, não assina, não prescreve e não finaliza prontuário autonomamente.
        Todo conteúdo gerado é <strong>rascunho</strong> até revisão humana explícita. Provedor: <code className="bg-amber-100 px-1 rounded">simulated</code> — nenhuma API externa está conectada.
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[{ key: 'configs', label: 'Casos de Uso' }, { key: 'drafts', label: 'Rascunhos Pendentes' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'configs' && (
        <div className="space-y-3">
          {configs.map(cfg => (
            <div key={cfg.useCase} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{cfg.label}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[cfg.risk]}`}>Risco: {cfg.risk}</span>
                  <span className="text-xs text-gray-400">provedor: {cfg.provider}</span>
                  {cfg.approved
                    ? <span className="text-xs text-emerald-600">✓ Aprovado</span>
                    : <span className="text-xs text-orange-500">⚠ Aguarda aprovação</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!cfg.approved && (
                  <button
                    onClick={() => setConfigs(prev => prev.map(c => c.useCase === cfg.useCase ? { ...c, approved: true } : c))}
                    className="text-xs px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  >
                    Aprovar
                  </button>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={cfg.enabled}
                    onChange={() => cfg.approved ? toggleConfig(cfg.useCase) : alert('Aprove o caso de uso antes de habilitar.')}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'drafts' && (
        <div className="space-y-3">
          {drafts.filter(d => d.status === 'PENDENTE').length === 0 && (
            <div className="text-center text-gray-400 py-8">Nenhum rascunho pendente de revisão.</div>
          )}
          {drafts.map(draft => (
            <div key={draft.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{draft.useCase}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{draft.createdAt}</div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{draft.inputSummary}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[draft.status]}`}>
                  {draft.status}
                </span>
              </div>
              {draft.status === 'PENDENTE' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => reviewDraft(draft.id, 'ACEITO')}
                    className="flex-1 text-sm px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium"
                  >
                    ✓ Aceitar Rascunho
                  </button>
                  <button
                    onClick={() => reviewDraft(draft.id, 'REJEITADO')}
                    className="flex-1 text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-medium"
                  >
                    ✗ Rejeitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
