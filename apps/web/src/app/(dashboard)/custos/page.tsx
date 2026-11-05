'use client';

import { useState } from 'react';
import {
  DollarSign, AlertTriangle, ExternalLink,
  Shield, Calendar, CreditCard, Zap, Smartphone,
  ChevronRight, Info, 
} from 'lucide-react';
import Link from 'next/link';

type Period = 'month' | 'quarter' | 'year';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'month',   label: 'Este mês' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year',    label: '12 meses' },
];

/* ── Cost item ── */
interface CostItem {
  id: string;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  chargedBy: 'walletz' | 'external';
  provider?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  href?: string;
  externalHref?: string;
  note?: string;
}

const COSTS: CostItem[] = [
  {
    id: 'walletz',
    label: 'Walletz (assinatura)',
    value: 'R$ 497,00',
    trend: '+0%',
    trendUp: false,
    chargedBy: 'walletz',
    icon: Shield,
    color: 'text-primary',
    bg: 'bg-primary/10',
    href: '/billing',
    note: 'Plano Professional · Fatura em 01/11',
  },
  {
    id: 'ai',
    label: 'IA (tokens)',
    value: 'R$ 3,20',
    trend: '+18%',
    trendUp: true,
    chargedBy: 'walletz',
    icon: Zap,
    color: 'text-neural-blue',
    bg: 'bg-neural-blue/10',
    href: '/configuracoes/ia',
    note: 'Anthropic Claude · ~45K tokens',
  },
  {
    id: 'meta',
    label: 'WhatsApp / Meta',
    value: '—',
    chargedBy: 'external',
    provider: 'Meta',
    icon: Smartphone,
    color: 'text-[#25D366]',
    bg: 'bg-[#25D366]/10',
    href: '/meta?tab=costs',
    externalHref: 'https://business.facebook.com/billing',
    note: 'WhatsApp não conectado',
  },
  {
    id: 'google',
    label: 'Google APIs',
    value: '—',
    chargedBy: 'external',
    provider: 'Google',
    icon: Calendar,
    color: 'text-[#4285F4]',
    bg: 'bg-[#4285F4]/10',
    externalHref: 'https://console.cloud.google.com/billing',
    note: 'Google Calendar grátis nos limites de uso',
  },
  {
    id: 'microsoft',
    label: 'Microsoft 365',
    value: '—',
    chargedBy: 'external',
    provider: 'Microsoft',
    icon: Calendar,
    color: 'text-[#5059C9]',
    bg: 'bg-[#5059C9]/10',
    externalHref: 'https://admin.microsoft.com',
    note: 'Gerenciado pelo cliente na conta Microsoft',
  },
];

/* ── Mini bar ── */
function MiniBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.min((value / total) * 100, 100);
  return (
    <div className="h-2 flex-1 rounded-full bg-surface-3 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CustosPage() {
  const [period, setPeriod] = useState<Period>('month');

  const wallettzCost  = 497 + 3.20;
  const externalCost  = 0; // whatsapp not connected
  const totalEstimate = wallettzCost + externalCost;

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Central de Custos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão unificada de todos os seus custos — Walletz e fornecedores externos.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface-1">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Total summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card sm:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Total estimado (mês)</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-display font-bold text-primary">
            {`R$ ${totalEstimate.toFixed(2).replace('.', ',')}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Outubro 2026</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Cobrado pelo Walletz</span>
            <Shield className="h-4 w-4 text-neural-success" />
          </div>
          <p className="text-2xl font-display font-semibold text-neural-success">
            R$ {wallettzCost.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Assinatura + IA</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Cobrado por fornecedores</span>
            <AlertTriangle className="h-4 w-4 text-neural-warning" />
          </div>
          <p className="text-2xl font-display font-semibold text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground mt-1">Meta, Google, Microsoft</p>
        </div>
      </div>

      {/* Transparency notice */}
      <div className="rounded-lg border border-border bg-surface-1 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-neural-blue shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Transparência de custos: </span>
          O Walletz cobra somente a assinatura do plano e tokens de IA (quando não BYOK).
          Custos de WhatsApp (Meta), Google APIs e Microsoft 365 são cobrados <strong>diretamente pelos fornecedores</strong> na conta do cliente — não passam pelo Walletz.
        </p>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Detalhamento</h3>
        {COSTS.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="neural-card p-5 flex items-center gap-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${item.bg}`}>
                <Icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    item.chargedBy === 'walletz'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-3 text-muted-foreground'
                  }`}>
                    {item.chargedBy === 'walletz' ? 'via Walletz' : `via ${item.provider}`}
                  </span>
                </div>
                {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className={`text-base font-display font-semibold ${item.value === '—' ? 'text-muted-foreground' : item.color}`}>
                    {item.value}
                  </p>
                  {item.trend && (
                    <p className={`text-[11px] ${item.trendUp ? 'text-neural-warning' : 'text-neural-success'}`}>
                      {item.trend} vs mês anterior
                    </p>
                  )}
                </div>
                {item.href && (
                  <Link href={item.href} className="btn-ghost rounded-md px-2.5 py-2 text-xs flex items-center gap-1">
                    Ver
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
                {item.externalHref && (
                  <a
                    href={item.externalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost rounded-md px-2.5 py-2 text-xs flex items-center gap-1"
                  >
                    Gerenciar
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual breakdown bar */}
      <div className="neural-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Composição do custo (Walletz)</h3>
        <div className="flex items-center gap-3">
          <MiniBar value={497} total={wallettzCost} color="bg-primary" />
          <span className="text-xs text-muted-foreground w-24 shrink-0">Assinatura 99%</span>
        </div>
        <div className="flex items-center gap-3">
          <MiniBar value={3.20} total={wallettzCost} color="bg-neural-blue" />
          <span className="text-xs text-muted-foreground w-24 shrink-0">IA 1%</span>
        </div>
        <p className="text-xs text-muted-foreground/60 pt-1">
          Custos Meta e Microsoft não incluídos pois são cobrados diretamente pelos fornecedores.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: '/billing',          label: 'Billing Walletz',   desc: 'Plano e faturas',             icon: CreditCard },
          { href: '/configuracoes/ia', label: 'Config. IA',        desc: 'Tokens e provedores',         icon: Zap },
          { href: '/meta?tab=costs',   label: 'Custos Meta',       desc: 'WhatsApp e templates',        icon: Smartphone },
        ].map(link => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3 hover:border-border/60 hover:bg-surface-2 transition-all group"
            >
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <p className="text-sm font-medium text-foreground">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 ml-auto" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
