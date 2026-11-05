'use client';

import { useState } from 'react';
import {
  Facebook, Smartphone, FileText, DollarSign,
  Activity, Webhook, Settings, CheckCircle2,
  XCircle, AlertTriangle, ExternalLink, ChevronRight,
  BarChart3, TrendingUp, MessageSquare, 
  Shield,
} from 'lucide-react';
import Link from 'next/link';

type MetaTab = 'overview' | 'whatsapp' | 'templates' | 'costs' | 'consumption' | 'webhooks' | 'settings';

const TABS: { id: MetaTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Visão Geral',  icon: BarChart3 },
  { id: 'whatsapp',     label: 'WhatsApp',     icon: Smartphone },
  { id: 'templates',    label: 'Templates',    icon: FileText },
  { id: 'costs',        label: 'Custos',       icon: DollarSign },
  { id: 'consumption',  label: 'Consumo',      icon: Activity },
  { id: 'webhooks',     label: 'Webhooks',     icon: Webhook },
  { id: 'settings',     label: 'Configurações',icon: Settings },
];

/* ── Overview Tab ── */
function OverviewTab() {
  const stats = [
    { label: 'WhatsApp',       value: 'Não conectado', status: 'disconnected', icon: Smartphone,    color: 'text-muted-foreground' },
    { label: 'Templates',      value: '0 aprovados',   status: 'neutral',      icon: FileText,      color: 'text-muted-foreground' },
    { label: 'Webhooks',       value: 'Não conf.',     status: 'disconnected', icon: Webhook,       color: 'text-muted-foreground' },
    { label: 'Mensagens hoje', value: '—',             status: 'neutral',      icon: MessageSquare, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="rounded-xl border border-border bg-surface-1 p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1877F2]/10 shrink-0">
          <Facebook className="h-6 w-6 text-[#1877F2]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">Meta Business</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">
              <XCircle className="h-2.5 w-2.5" />
              Não conectado
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Conecte sua conta Meta Business para habilitar WhatsApp, templates e relatórios.
          </p>
        </div>
        <Link
          href="/canais/whatsapp"
          className="flex items-center gap-2 rounded-lg bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] px-4 py-2 text-sm font-medium hover:bg-[#1877F2]/20 transition-colors shrink-0"
        >
          Conectar Meta
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Ações rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { href: '/canais/whatsapp', label: 'Conectar WhatsApp',        desc: 'Configure seu número oficial',         icon: Smartphone, color: 'bg-[#25D366]/10 text-[#25D366]' },
            { href: '/meta/templates',  label: 'Gerenciar Templates',       desc: 'Crie e envie templates para aprovação', icon: FileText,   color: 'bg-primary/10 text-primary' },
            { href: '/campanhas',       label: 'Criar Campanha',            desc: 'Envie mensagens em massa',              icon: TrendingUp, color: 'bg-neural-blue/10 text-neural-blue' },
            { href: '/meta?tab=costs',  label: 'Ver Custos Meta',           desc: 'Acompanhe gastos por campanha',         icon: DollarSign, color: 'bg-neural-warning/10 text-neural-warning' },
          ].map(action => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3 hover:border-border/60 hover:bg-surface-2 transition-all group"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${action.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 ml-auto group-hover:text-primary/60 transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Requirements */}
      <div className="neural-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Pré-requisitos Meta</h3>
        {[
          { label: 'Conta Meta Business Manager',   done: false },
          { label: 'WhatsApp Business Account (WABA)', done: false },
          { label: 'Número verificado',             done: false },
          { label: 'Webhook configurado',           done: false },
          { label: 'Política de privacidade aprovada', done: false },
        ].map(req => (
          <div key={req.label} className="flex items-center gap-3">
            {req.done
              ? <CheckCircle2 className="h-4 w-4 text-neural-success shrink-0" />
              : <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
            }
            <span className={`text-sm ${req.done ? 'text-foreground' : 'text-muted-foreground'}`}>
              {req.label}
            </span>
          </div>
        ))}
        <div className="pt-2">
          <a
            href="https://business.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-neural-blue hover:text-neural-blue/80 transition-colors"
          >
            Acessar Meta Business Manager
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── WhatsApp Tab ── */
function WhatsAppTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#25D366]/20 bg-[#25D366]/5 p-6 flex flex-col items-center text-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25D366]/10">
          <Smartphone className="h-8 w-8 text-[#25D366]" />
        </div>
        <div>
          <h3 className="text-base font-display font-semibold text-foreground mb-1">WhatsApp não conectado</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Configure seu número oficial do WhatsApp Business para que seus agentes possam enviar e receber mensagens.
          </p>
        </div>
        <Link
          href="/canais/whatsapp"
          className="flex items-center gap-2 rounded-lg bg-[#25D366] text-white hover:bg-[#22c55e] px-6 py-2.5 text-sm font-semibold transition-colors"
        >
          Configurar WhatsApp
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="neural-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Como conectar</h3>
        {[
          { n: 1, label: 'Conta Meta', desc: 'Acesse sua conta Meta Business Manager' },
          { n: 2, label: 'WABA', desc: 'Crie ou selecione seu WhatsApp Business Account' },
          { n: 3, label: 'Número', desc: 'Adicione e verifique seu número de telefone' },
          { n: 4, label: 'Webhook', desc: 'O Walletz configura o webhook automaticamente' },
          { n: 5, label: 'Template', desc: 'Crie templates para iniciar conversas' },
          { n: 6, label: 'Agente', desc: 'Associe um agente ao número conectado' },
        ].map(step => (
          <div key={step.n} className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {step.n}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Costs Tab ── */
function CostsTab() {
  return (
    <div className="space-y-6">
      <div className="neural-card p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-neural-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Cobrança Meta é separada</p>
            <p className="text-sm text-muted-foreground">
              Os custos do WhatsApp Business são cobrados diretamente pela Meta na sua conta.
              O Walletz não intermedia esses valores — você paga a Meta diretamente.
            </p>
          </div>
        </div>
        <a
          href="https://business.facebook.com/billing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-neural-blue hover:text-neural-blue/80 transition-colors"
        >
          Gerenciar cobrança na Meta
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Conversas iniciadas pela empresa', value: '—', period: 'Este mês', color: 'text-neural-blue' },
          { label: 'Conversas iniciadas pelo cliente',  value: '—', period: 'Este mês', color: 'text-neural-cyan' },
          { label: 'Total estimado Meta',               value: '—', period: 'Este mês', color: 'text-neural-warning' },
          { label: 'Limite configurado',                value: 'Sem limite', period: 'Configurar alerta', color: 'text-muted-foreground' },
        ].map(item => (
          <div key={item.label} className="stat-card">
            <p className="text-xs text-muted-foreground mb-3">{item.label}</p>
            <p className={`text-xl font-display font-semibold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{item.period}</p>
          </div>
        ))}
      </div>

      <div className="neural-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Categorias de conversa Meta</h3>
        <p className="text-xs text-muted-foreground mb-4">
          A Meta cobra por conversa, não por mensagem. Cada conversa tem janela de 24h.
        </p>
        <div className="space-y-2">
          {[
            { cat: 'Marketing',      desc: 'Promoções e anúncios',    price: '~R$ 0,12/conversa' },
            { cat: 'Utility',        desc: 'Confirmações e alertas',  price: '~R$ 0,04/conversa' },
            { cat: 'Authentication', desc: 'Senhas e verificação',    price: '~R$ 0,04/conversa' },
            { cat: 'Service',        desc: 'Resposta ao cliente',     price: 'Gratuita (24h)' },
          ].map(r => (
            <div key={r.cat} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{r.cat}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{r.price}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-3">
          * Preços aproximados para Brasil. Consulte a tabela oficial na Meta.
        </p>
      </div>
    </div>
  );
}

/* ── Webhooks Tab ── */
function WebhooksTab() {
  return (
    <div className="space-y-4">
      <div className="neural-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Webhook WhatsApp</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
            <XCircle className="h-3 w-3" />
            Não configurado
          </span>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">URL do Webhook</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-mono text-xs text-muted-foreground select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/v1/webhooks/meta` : 'https://sua-api.walletz.app/api/v1/webhooks/meta'}
            </div>
            <button className="btn-ghost rounded-lg px-3 py-2.5 text-xs">Copiar</button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Verify Token</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-mono text-xs text-muted-foreground">
              ••••••••••••••••
            </div>
            <button className="btn-ghost rounded-lg px-3 py-2.5 text-xs">Revelar</button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70">
          O Walletz configura o webhook automaticamente ao conectar o WhatsApp.
        </p>
      </div>

      <div className="neural-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Eventos monitorados</h3>
        {[
          { event: 'messages',              status: 'pending', desc: 'Mensagens recebidas' },
          { event: 'message_deliveries',    status: 'pending', desc: 'Confirmações de entrega' },
          { event: 'message_reads',         status: 'pending', desc: 'Leituras de mensagem' },
          { event: 'messaging_handovers',   status: 'pending', desc: 'Transferência de conversa' },
        ].map(ev => (
          <div key={ev.event} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-foreground">{ev.event}</p>
              <p className="text-xs text-muted-foreground">{ev.desc}</p>
            </div>
            <span className="text-xs text-muted-foreground/60">Aguardando conexão</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Settings Tab ── */
function SettingsTab() {
  return (
    <div className="space-y-4">
      <div className="neural-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Configurações da conta Meta</h3>
        <p className="text-sm text-muted-foreground">
          Conecte uma conta Meta Business para habilitar as configurações.
        </p>
        <div className="space-y-2">
          {[
            { label: 'App ID', value: 'Não configurado' },
            { label: 'App Secret', value: '••••••••' },
            { label: 'Versão da API', value: 'v20.0' },
            { label: 'Business Account ID', value: 'Não conectado' },
          ].map(field => (
            <div key={field.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <span className="text-sm text-muted-foreground">{field.label}</span>
              <span className="text-sm font-mono text-foreground">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="neural-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-neural-success" />
          <h3 className="text-sm font-semibold text-foreground">Política de privacidade</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          A Meta exige URL de política de privacidade para aprovar templates. Configure antes de enviar.
        </p>
        <input
          disabled
          placeholder="https://walletz.app/privacidade"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted-foreground opacity-60 cursor-not-allowed"
        />
      </div>
    </div>
  );
}

/* ── Page ── */
export default function MetaPage() {
  const [tab, setTab] = useState<MetaTab>('overview');

  const tabContent: Record<MetaTab, React.ReactNode> = {
    overview:    <OverviewTab />,
    whatsapp:    <WhatsAppTab />,
    templates:   (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Gerencie templates na página dedicada.</p>
          <Link href="/meta/templates" className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Abrir Template Manager
          </Link>
        </div>
      </div>
    ),
    costs:       <CostsTab />,
    consumption: (
      <div className="neural-card p-8 flex flex-col items-center text-center gap-3">
        <Activity className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Dados de consumo disponíveis após conectar WhatsApp</p>
      </div>
    ),
    webhooks:    <WebhooksTab />,
    settings:    <SettingsTab />,
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Central Meta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie WhatsApp Business, templates, custos e configurações Meta.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto no-scrollbar">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tabContent[tab]}
    </div>
  );
}
