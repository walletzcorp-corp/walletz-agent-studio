'use client';

import { useState } from 'react';
import {
  Brain, CheckCircle2, XCircle, AlertTriangle,
  Eye, EyeOff, Save, Zap, DollarSign,
  BarChart3, Shield, ChevronDown, Info,
  Activity, Clock, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

/* ── Types ── */
type AIProvider = 'anthropic' | 'google_gemini' | 'openai' | 'ollama';
type AIStrategy = 'economy' | 'balanced' | 'quality';

interface ProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  models: { id: string; name: string; context: string; cost: string; recommended?: boolean }[];
  status: 'connected' | 'disconnected' | 'error';
  keyPrefix: string;
  docsUrl: string;
  color: string;
  bgClass: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Modelos Claude para raciocínio avançado e uso de ferramentas.',
    status: 'connected',
    keyPrefix: 'sk-ant-',
    docsUrl: 'https://docs.anthropic.com',
    color: '#D97706',
    bgClass: 'bg-[#D97706]/10 text-[#D97706]',
    models: [
      { id: 'claude-sonnet-4-6',        name: 'Claude Sonnet 4.6',   context: '200K',  cost: '~R$ 0,12/1K tokens', recommended: true },
      { id: 'claude-haiku-4-5',         name: 'Claude Haiku 4.5',    context: '200K',  cost: '~R$ 0,02/1K tokens' },
      { id: 'claude-opus-5-5',          name: 'Claude Opus 5.5',     context: '200K',  cost: '~R$ 0,75/1K tokens' },
    ],
  },
  {
    id: 'google_gemini',
    name: 'Google Gemini',
    description: 'Modelos Gemini para desenvolvimento e testes com custo baixo.',
    status: 'disconnected',
    keyPrefix: 'AIza',
    docsUrl: 'https://ai.google.dev',
    color: '#4285F4',
    bgClass: 'bg-[#4285F4]/10 text-[#4285F4]',
    models: [
      { id: 'gemini-1.5-flash',      name: 'Gemini 1.5 Flash',    context: '1M',    cost: 'Gratuito (quota)', recommended: true },
      { id: 'gemini-1.5-pro',        name: 'Gemini 1.5 Pro',      context: '2M',    cost: '~R$ 0,04/1K tokens' },
      { id: 'gemini-2.0-flash',      name: 'Gemini 2.0 Flash',    context: '1M',    cost: 'Gratuito (quota)' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Modelos GPT-4 para casos de uso gerais.',
    status: 'disconnected',
    keyPrefix: 'sk-',
    docsUrl: 'https://platform.openai.com',
    color: '#10A37F',
    bgClass: 'bg-[#10A37F]/10 text-[#10A37F]',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', context: '128K', cost: '~R$ 0,03/1K tokens', recommended: true },
      { id: 'gpt-4o',      name: 'GPT-4o',      context: '128K', cost: '~R$ 0,25/1K tokens' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (local)',
    description: 'Modelos locais para privacidade total e custo zero.',
    status: 'disconnected',
    keyPrefix: 'http://localhost:11434',
    docsUrl: 'https://ollama.ai',
    color: '#94A3B8',
    bgClass: 'bg-surface-2 text-muted-foreground',
    models: [
      { id: 'llama3.2',  name: 'Llama 3.2',   context: '128K', cost: 'Gratuito (local)', recommended: true },
      { id: 'mistral',   name: 'Mistral 7B',  context: '32K',  cost: 'Gratuito (local)' },
    ],
  },
];

const STRATEGIES: { id: AIStrategy; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { id: 'economy',  label: 'Econômico',    desc: 'Usa o modelo mais barato disponível',       icon: DollarSign, color: 'text-neural-success' },
  { id: 'balanced', label: 'Equilibrado',  desc: 'Balanceia custo e qualidade de resposta',   icon: Zap,        color: 'text-neural-blue' },
  { id: 'quality',  label: 'Qualidade',    desc: 'Usa sempre o melhor modelo disponível',     icon: Brain,      color: 'text-primary' },
];

/* ── Provider card ── */
function ProviderCard({
  provider,
  isDefault,
  onSetDefault,
}: {
  provider: ProviderConfig;
  isDefault: boolean;
  onSetDefault: () => void;
}) {
  const [expanded, setExpanded] = useState(isDefault);
  const [showKey, setShowKey] = useState(false);
  const [keyValue, setKeyValue] = useState(provider.status === 'connected' ? '••••••••••••••••••••••••••' : '');
  const [selectedModel, setSelectedModel] = useState(provider.models.find(m => m.recommended)?.id ?? provider.models[0]?.id ?? '');

  const statusConfig = {
    connected:    { label: 'Conectado', className: 'badge-success', icon: CheckCircle2 },
    disconnected: { label: 'Não configurado', className: 'bg-surface-2 text-muted-foreground border border-border', icon: XCircle },
    error:        { label: 'Erro', className: 'badge-danger', icon: AlertTriangle },
  }[provider.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className={`neural-card overflow-hidden transition-all ${isDefault ? 'border-primary/40' : ''}`}>
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-2/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-border shrink-0 ${provider.bgClass}`}>
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{provider.name}</p>
              {isDefault && (
                <span className="badge-primary text-[10px] px-2 py-0.5 rounded-full font-semibold">Padrão</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{provider.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusConfig.className}`}>
            <StatusIcon className="h-2.5 w-2.5" />
            {statusConfig.label}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/50">
          {/* API Key */}
          <div className="space-y-1.5 pt-4">
            <label className="text-xs font-medium text-muted-foreground">
              {provider.id === 'ollama' ? 'URL base (Ollama)' : 'API Key'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyValue}
                onChange={e => setKeyValue(e.target.value)}
                placeholder={provider.id === 'ollama' ? 'http://localhost:11434' : `${provider.keyPrefix}…`}
                className="flex-1 rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="btn-ghost rounded-lg px-3 py-2.5 text-sm"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Chave criptografada com AES-256. Nunca visível em logs.
              <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" className="text-neural-blue hover:underline ml-1">
                Obter chave
              </a>
            </p>
          </div>

          {/* Model selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Modelo</label>
            <div className="space-y-1.5">
              {provider.models.map(model => (
                <label
                  key={model.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModel === model.id
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-surface-1 hover:border-border/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`model-${provider.id}`}
                      value={model.id}
                      checked={selectedModel === model.id}
                      onChange={() => setSelectedModel(model.id)}
                      className="accent-primary"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{model.name}</p>
                        {model.recommended && (
                          <span className="text-[10px] text-neural-success font-medium">Recomendado</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Contexto: {model.context}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{model.cost}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button className="btn-primary flex-1 rounded-lg py-2.5 text-sm flex items-center justify-center gap-2">
              <Save className="h-4 w-4" />
              Salvar configuração
            </button>
            {!isDefault && provider.status === 'connected' && (
              <button
                onClick={onSetDefault}
                className="btn-ghost rounded-lg px-4 py-2.5 text-sm border border-border"
              >
                Definir como padrão
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function AIConfigPage() {
  const [defaultProvider, setDefaultProvider] = useState<AIProvider>('anthropic');
  const [fallbackProvider, setFallbackProvider] = useState<AIProvider | 'none'>('none');
  const [strategy, setStrategy] = useState<AIStrategy>('balanced');

  const connectedProviders = PROVIDERS.filter(p => p.status === 'connected');

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/configuracoes" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Configurações de IA</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie provedores, modelos, estratégias e consumo de IA.
          </p>
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tokens hoje',          value: '12.4K',   icon: Activity, color: 'text-primary' },
          { label: 'Custo estimado (mês)', value: 'R$ 3,20', icon: DollarSign, color: 'text-neural-warning' },
          { label: 'Provedores ativos',    value: connectedProviders.length.toString(), icon: Brain, color: 'text-neural-success' },
          { label: 'Chamadas hoje',        value: '87',      icon: BarChart3, color: 'text-neural-blue' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-xl font-display font-semibold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Strategy */}
      <div className="neural-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Estratégia de IA</h3>
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STRATEGIES.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${
                  strategy === s.id
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-surface-1 hover:border-border/60'
                }`}
              >
                <Icon className={`h-5 w-5 ${s.color}`} />
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{s.desc}</p>
                {strategy === s.id && (
                  <span className="text-[10px] text-primary font-semibold">Ativo</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global settings */}
      <div className="neural-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Configurações globais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Provider padrão</label>
            <select
              value={defaultProvider}
              onChange={e => setDefaultProvider(e.target.value as AIProvider)}
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              {PROVIDERS.map(p => (
                <option key={p.id} value={p.id} disabled={p.status !== 'connected'}>
                  {p.name} {p.status !== 'connected' ? '(não configurado)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fallback</label>
            <select
              value={fallbackProvider}
              onChange={e => setFallbackProvider(e.target.value as AIProvider | 'none')}
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="none">Sem fallback</option>
              {PROVIDERS.filter(p => p.id !== defaultProvider).map(p => (
                <option key={p.id} value={p.id} disabled={p.status !== 'connected'}>
                  {p.name} {p.status !== 'connected' ? '(não configurado)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-1">
          <div>
            <p className="text-sm font-medium text-foreground">Modo de teste (Gemini grátis)</p>
            <p className="text-xs text-muted-foreground">Usa Gemini Flash no laboratório para economizar créditos</p>
          </div>
          <button className="relative h-6 w-11 rounded-full bg-surface-3 transition-colors">
            <span className="absolute top-1 left-1 h-4 w-4 rounded-full bg-muted-foreground shadow transition-transform" />
          </button>
        </div>
      </div>

      {/* Provider cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Provedores</h3>
        {PROVIDERS.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isDefault={defaultProvider === provider.id}
            onSetDefault={() => setDefaultProvider(provider.id)}
          />
        ))}
      </div>

      {/* BYOK info */}
      <div className="rounded-lg border border-border bg-surface-1 p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-neural-success shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">BYOK — Bring Your Own Key</p>
          <p className="text-xs text-muted-foreground">
            Cada empresa pode configurar suas próprias chaves de API por segurança e controle de custos.
            As chaves são criptografadas com AES-256-GCM, isoladas por tenant e jamais aparecem em logs ou no frontend completas.
          </p>
        </div>
      </div>
    </div>
  );
}
