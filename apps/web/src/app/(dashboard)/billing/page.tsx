'use client';

import { useState } from 'react';
import {
  CreditCard, FileText, TrendingUp, Users, Bot,
  MessageSquare, Database, Zap, Calendar, CheckCircle2,
  AlertTriangle, ExternalLink, ChevronRight, Download,
  Shield, Clock, DollarSign,
} from 'lucide-react';

type BillingTab = 'overview' | 'plan' | 'invoices' | 'payment';

const TABS: { id: BillingTab; label: string }[] = [
  { id: 'overview',  label: 'Visão Geral' },
  { id: 'plan',      label: 'Plano' },
  { id: 'invoices',  label: 'Faturas' },
  { id: 'payment',   label: 'Pagamento' },
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 197',
    period: '/mês',
    features: ['1 agente', '1.000 conversas/mês', '10 MB de conhecimento', 'WhatsApp (BYOC)', 'Suporte por e-mail'],
    limits: { agents: 1, conversations: 1000, knowledge_mb: 10, users: 1 },
    current: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'R$ 497',
    period: '/mês',
    features: ['5 agentes', '10.000 conversas/mês', '500 MB de conhecimento', 'WhatsApp + Meta', 'Google/Microsoft Calendar', 'Suporte prioritário', 'Relatórios avançados'],
    limits: { agents: 5, conversations: 10000, knowledge_mb: 500, users: 5 },
    current: true,
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R$ 1.197',
    period: '/mês',
    features: ['Agentes ilimitados', '50.000 conversas/mês', '5 GB de conhecimento', 'Todos os canais', 'BYOK (chave própria de IA)', 'SLA dedicado', 'Onboarding personalizado'],
    limits: { agents: -1, conversations: 50000, knowledge_mb: 5120, users: -1 },
    current: false,
  },
];

/* ── Usage bar ── */
function UsageBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max < 0 ? 0 : Math.min((value / max) * 100, 100);
  const color = pct > 90 ? 'bg-neural-danger' : pct > 70 ? 'bg-neural-warning' : 'bg-primary';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">
          {max < 0 ? `${value} / ∞` : `${value.toLocaleString()} / ${max.toLocaleString()}`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab() {
  const currentPlan = PLANS.find(p => p.current)!;

  const usage = [
    { label: 'Agentes criados',        value: 2,   max: currentPlan.limits.agents },
    { label: 'Conversas este mês',     value: 847, max: currentPlan.limits.conversations },
    { label: 'Conhecimento (MB)',       value: 45,  max: currentPlan.limits.knowledge_mb },
    { label: 'Usuários',               value: 2,   max: currentPlan.limits.users },
  ];

  return (
    <div className="space-y-6">
      {/* Current plan card */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 via-surface-1 to-surface-1 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-display font-bold text-foreground">{currentPlan.name}</span>
              <span className="badge-primary text-[11px] px-2 py-0.5 rounded-full font-medium">Plano atual</span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">
              {currentPlan.price}<span className="text-sm text-muted-foreground font-normal">{currentPlan.period}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Próxima cobrança: <span className="text-foreground">1 Nov 2026</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost rounded-lg px-4 py-2 text-sm flex items-center gap-2">
              Alterar plano
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="neural-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Consumo do plano</h3>
        {usage.map(u => (
          <UsageBar key={u.label} {...u} />
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Valor próxima fatura',    value: 'R$ 497',    icon: DollarSign,  color: 'text-primary' },
          { label: 'Ciclo de cobrança',       value: 'Mensal',    icon: Calendar,    color: 'text-neural-blue' },
          { label: 'Conversas restantes',     value: '9.153',     icon: MessageSquare, color: 'text-neural-cyan' },
          { label: 'Faturas pagas',           value: '3',         icon: CheckCircle2,  color: 'text-neural-success' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-lg font-display font-semibold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Payment method */}
      <div className="neural-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
            <p className="text-xs text-muted-foreground">Visa · Expira 08/28</p>
          </div>
        </div>
        <button className="btn-ghost rounded-lg px-3 py-2 text-sm">Atualizar</button>
      </div>
    </div>
  );
}

/* ── Plans Tab ── */
function PlansTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upgrade ou downgrade a qualquer momento. Mudanças são cobradas proporcionalmente.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`relative rounded-xl border p-6 flex flex-col gap-4 ${
              plan.current
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-surface-1 hover:border-border/60'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
                Mais popular
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{plan.name}</p>
              <p className="text-2xl font-display font-bold text-foreground mt-1">
                {plan.price}
                <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
              </p>
            </div>
            <ul className="flex-1 space-y-2">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-neural-success shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.current}
              className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                plan.current
                  ? 'bg-primary/10 text-primary cursor-default'
                  : 'bg-surface-2 text-foreground hover:bg-surface-3'
              }`}
            >
              {plan.current ? 'Plano atual' : 'Selecionar'}
            </button>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-surface-1 p-4 flex items-center gap-3">
        <Shield className="h-5 w-5 text-neural-success shrink-0" />
        <p className="text-sm text-muted-foreground">
          Pagamento seguro processado via Stripe. Cancelamento sem burocracia a qualquer momento.
        </p>
      </div>
    </div>
  );
}

/* ── Invoices Tab ── */
function InvoicesTab() {
  const invoices = [
    { id: 'INV-2026-10', period: 'Outubro 2026',   amount: 'R$ 497,00', status: 'pending',  date: '01/10/2026' },
    { id: 'INV-2026-09', period: 'Setembro 2026',  amount: 'R$ 497,00', status: 'paid',     date: '01/09/2026' },
    { id: 'INV-2026-08', period: 'Agosto 2026',    amount: 'R$ 497,00', status: 'paid',     date: '01/08/2026' },
    { id: 'INV-2026-07', period: 'Julho 2026',     amount: 'R$ 497,00', status: 'paid',     date: '01/07/2026' },
  ];

  return (
    <div className="neural-card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Fatura</th>
            <th>Período</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td className="font-mono text-sm text-foreground">{inv.id}</td>
              <td className="text-sm">{inv.period}</td>
              <td className="text-sm font-semibold text-foreground">{inv.amount}</td>
              <td>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  inv.status === 'paid' ? 'badge-success' : 'badge-warning'
                }`}>
                  {inv.status === 'paid' ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                  {inv.status === 'paid' ? 'Pago' : 'Pendente'}
                </span>
              </td>
              <td className="text-sm text-muted-foreground">{inv.date}</td>
              <td>
                <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Payment Tab ── */
function PaymentTab() {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="neural-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Método de pagamento</h3>
        <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Visa •••• 4242</p>
              <p className="text-xs text-muted-foreground">Expira 08/28 · Principal</p>
            </div>
          </div>
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </div>
        <button className="btn-ghost w-full rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 border border-dashed border-border">
          <CreditCard className="h-4 w-4" />
          Adicionar cartão
        </button>
      </div>

      <div className="neural-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Dados de faturamento</h3>
        {[
          { label: 'CNPJ / CPF', value: '—' },
          { label: 'Razão social', value: '—' },
          { label: 'E-mail fiscal', value: '—' },
          { label: 'Endereço', value: '—' },
        ].map(f => (
          <div key={f.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
            <span className="text-sm text-muted-foreground">{f.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground italic">{f.value}</span>
              <button className="text-xs text-neural-blue hover:underline">Editar</button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface-1 p-4 flex items-start gap-2">
        <Shield className="h-4 w-4 text-neural-success shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Seus dados de pagamento são processados pelo Stripe e nunca armazenados pelo Walletz.
        </p>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function BillingPage() {
  const [tab, setTab] = useState<BillingTab>('overview');

  const tabContent: Record<BillingTab, React.ReactNode> = {
    overview: <OverviewTab />,
    plan:     <PlansTab />,
    invoices: <InvoicesTab />,
    payment:  <PaymentTab />,
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plano Walletz, faturas e pagamento. Cobranças de terceiros (Meta, IA) são separadas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface-1 border border-border rounded-lg px-3 py-2">
          <Shield className="h-3.5 w-3.5 text-neural-success" />
          Pago via Stripe · Seguro
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tabContent[tab]}
    </div>
  );
}
