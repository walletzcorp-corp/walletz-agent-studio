'use client';

import { useState } from 'react';

// Integrações com serviços externos são apenas adaptadores — status NAO_CONFIGURADO por padrão.
// Webhooks devem ser assinados, idempotentes e observáveis.
// Portal do paciente controla acesso, consentimento e expiração de sessão.

const CONNECTOR_STATUS_COLORS: Record<string, string> = {
  ATIVO:            'bg-emerald-100 text-emerald-800',
  INATIVO:          'bg-gray-100 text-gray-500',
  NAO_CONFIGURADO:  'bg-yellow-100 text-yellow-800',
};

const MOCK_CONNECTORS = [
  { id: 'c1', connectorType: 'HUBSPOT',    name: 'HubSpot CRM',           status: 'NAO_CONFIGURADO', lastSync: null },
  { id: 'c2', connectorType: 'RD_STATION', name: 'RD Station',            status: 'NAO_CONFIGURADO', lastSync: null },
  { id: 'c3', connectorType: 'FHIR_RNDS',  name: 'FHIR / RNDS',          status: 'NAO_CONFIGURADO', lastSync: null },
  { id: 'c4', connectorType: 'WHATSAPP',   name: 'WhatsApp Business',     status: 'NAO_CONFIGURADO', lastSync: null },
  { id: 'c5', connectorType: 'EMAIL',      name: 'E-mail (SMTP)',         status: 'ATIVO',           lastSync: '2026-10-01 09:00' },
  { id: 'c6', connectorType: 'SMS',        name: 'SMS Gateway',           status: 'NAO_CONFIGURADO', lastSync: null },
  { id: 'c7', connectorType: 'PAGAMENTO',  name: 'Gateway de Pagamento',  status: 'NAO_CONFIGURADO', lastSync: null },
];

const MOCK_WEBHOOKS = [
  { id: 'w1', name: 'ERP Integrador', url: 'https://erp.example.com/hook', events: ['patient.created', 'appointment.done'], status: 'ATIVO', attempts: 124 },
  { id: 'w2', name: 'Billing System', url: 'https://billing.example.com/wh', events: ['payment.received'], status: 'INATIVO', attempts: 0 },
];

export default function IntegracoesPage() {
  const [connectors] = useState(MOCK_CONNECTORS);
  const [webhooks, setWebhooks] = useState(MOCK_WEBHOOKS);
  const [tab, setTab] = useState<'connectors' | 'webhooks' | 'portal'>('connectors');

  function toggleWebhook(id: string) {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, status: w.status === 'ATIVO' ? 'INATIVO' : 'ATIVO' } : w));
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrações e Portal do Paciente</h1>
        <p className="text-sm text-gray-500 mt-1">
          Módulo 12 (INT) — Conectores externos, webhooks e portal do paciente
        </p>
      </div>

      {/* Aviso */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-sm text-yellow-800">
        <strong>Aviso:</strong> Integrações com HubSpot, RD Station, WhatsApp, FHIR/RNDS, pagamento e SMS estão em modo
        <strong> NAO_CONFIGURADO</strong>. Nenhuma chamada real é feita sem credenciais validadas e teste em ambiente de homologação.
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'connectors', label: 'Conectores' },
          { key: 'webhooks',   label: 'Webhooks' },
          { key: 'portal',     label: 'Portal do Paciente' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'connectors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {connectors.map(con => (
            <div key={con.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{con.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{con.connectorType}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${CONNECTOR_STATUS_COLORS[con.status]}`}>
                  {con.status}
                </span>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                {con.lastSync ? `Última sinc.: ${con.lastSync}` : 'Nunca sincronizado'}
              </div>
              {con.status === 'NAO_CONFIGURADO' && (
                <button
                  className="mt-3 w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                  onClick={() => alert('Configuração de conector requer credenciais e ambiente de homologação validados.')}
                >
                  Configurar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              className="text-sm px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
              onClick={() => alert('Ao criar um webhook, um segredo HMAC é gerado e exibido UMA VEZ. Guarde-o com segurança.')}
            >
              + Novo Webhook
            </button>
          </div>
          {webhooks.map(wh => (
            <div key={wh.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{wh.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-xs">{wh.url}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wh.events.map(ev => (
                      <span key={ev} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ev}</span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Entregas totais: {wh.attempts}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${wh.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                    {wh.status}
                  </span>
                  <button
                    onClick={() => toggleWebhook(wh.id)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
                  >
                    {wh.status === 'ATIVO' ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => alert('Rotação de segredo: o novo segredo é exibido UMA VEZ. Configure o receptor antes de confirmar.')}
                    className="text-xs px-2 py-1 border border-amber-200 rounded text-amber-600 hover:bg-amber-50"
                  >
                    Rotacionar Segredo
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'portal' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Portal do Paciente</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <span className="text-emerald-500 text-lg">✓</span>
                <div>
                  <div className="font-medium">Sessão com token único e expiração configurável</div>
                  <div className="text-xs text-gray-400">Padrão: 4 horas. Token de 48 bytes base64url.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <span className="text-emerald-500 text-lg">✓</span>
                <div>
                  <div className="font-medium">Consentimentos de integração por paciente</div>
                  <div className="text-xs text-gray-400">Cada conector requer consentimento explícito com escopo e expiração.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <span className="text-emerald-500 text-lg">✓</span>
                <div>
                  <div className="font-medium">Revogação imediata de sessão</div>
                  <div className="text-xs text-gray-400">Sessões podem ser revogadas a qualquer momento por profissional autorizado.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <span className="text-emerald-500 text-lg">✓</span>
                <div>
                  <div className="font-medium">Recursos FHIR R4</div>
                  <div className="text-xs text-gray-400">Estruturas geradas e armazenadas; transmissão real requer configuração de endpoint RNDS.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
