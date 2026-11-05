'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight, CheckCircle2, Clock, AlertTriangle, XCircle, Pause,
  Building2, Users, Shield, CreditCard, FileText, BarChart3,
  Bot, Smartphone, Puzzle, Brain, Calendar, Megaphone,
  ClipboardList, AlertOctagon, Edit, Ban, RefreshCw,
  TrendingUp, Mail, Phone, Globe, ArrowUpRight,
} from 'lucide-react';

/* ── Types ── */
type ClientStatus = 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled';

const STATUS_CONFIG: Record<ClientStatus, { label: string; className: string; icon: React.ElementType }> = {
  active:    { label: 'Ativo',        className: 'badge-success', icon: CheckCircle2 },
  trial:     { label: 'Trial',        className: 'badge-warning', icon: Clock },
  past_due:  { label: 'Inadimplente', className: 'badge-danger',  icon: AlertTriangle },
  suspended: { label: 'Suspenso',     className: 'bg-surface-3 text-muted-foreground border border-border', icon: Pause },
  cancelled: { label: 'Cancelado',    className: 'bg-surface-3 text-muted-foreground/60 border border-border', icon: XCircle },
};

/* ── Mock data ── */
const CLIENT = {
  id: '1',
  company: 'Tech Solutions Ltda.',
  fantasyName: 'Tech Solutions',
  cnpj: '12.345.678/0001-90',
  segment: 'Tecnologia',
  owner: 'Ricardo Alves',
  email: 'admin@techsol.com',
  phone: '+55 11 99001-1234',
  website: 'techsol.com',
  country: 'Brasil',
  state: 'SP',
  city: 'São Paulo',
  employees: '11–50',
  plan: 'Professional',
  status: 'active' as ClientStatus,
  createdAt: '01/09/2026',
  trialUntil: null as string | null,
  lastAccess: '06/10/2026',
  mrr: 'R$ 497',
  arr: 'R$ 5.964',
  nextBilling: '01/11/2026',
  users: 4,
  agents: 3,
  whatsapp: true,
  waNumber: '+55 11 93000-1234',
  aiTokens: 84200,
  conversations: 312,
  tenantSlug: 'tech-solutions',
};

const TABS = [
  { id: 'overview',      label: 'Visão Geral',  icon: BarChart3 },
  { id: 'company',       label: 'Empresa',      icon: Building2 },
  { id: 'users',         label: 'Usuários',     icon: Users },
  { id: 'plan',          label: 'Plano',        icon: Shield },
  { id: 'subscription',  label: 'Assinatura',   icon: CreditCard },
  { id: 'invoices',      label: 'Faturas',      icon: FileText },
  { id: 'usage',         label: 'Consumo',      icon: TrendingUp },
  { id: 'agents',        label: 'Agentes',      icon: Bot },
  { id: 'whatsapp',      label: 'WhatsApp',     icon: Smartphone },
  { id: 'integrations',  label: 'Integrações',  icon: Puzzle },
  { id: 'ai',            label: 'IA',           icon: Brain },
  { id: 'calendars',     label: 'Agendas',      icon: Calendar },
  { id: 'campaigns',     label: 'Campanhas',    icon: Megaphone },
  { id: 'audit',         label: 'Auditoria',    icon: ClipboardList },
  { id: 'errors',        label: 'Erros',        icon: AlertOctagon },
];

/* ── Tab content components ── */
function TabOverview() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'MRR',          value: CLIENT.mrr,                      color: 'text-neural-success' },
          { label: 'ARR Estimado', value: CLIENT.arr,                      color: 'text-primary' },
          { label: 'Conversas 30d',value: String(CLIENT.conversations),    color: 'text-neural-blue' },
          { label: 'Tokens IA 30d',value: CLIENT.aiTokens.toLocaleString(),color: 'text-neural-cyan' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
            <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="neural-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Saúde da conta</h3>
          {[
            { label: 'WhatsApp conectado',   ok: CLIENT.whatsapp },
            { label: 'Agentes publicados',   ok: CLIENT.agents > 0 },
            { label: 'Usuários ativos',      ok: CLIENT.users > 1 },
            { label: 'Acesso últimos 7 dias', ok: true },
            { label: 'Pagamento em dia',     ok: CLIENT.status === 'active' },
          ].map(h => (
            <div key={h.label} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
              <span className="text-sm text-muted-foreground">{h.label}</span>
              <CheckCircle2 className={`h-4 w-4 ${h.ok ? 'text-neural-success' : 'text-neural-danger'}`} />
            </div>
          ))}
        </div>
        <div className="neural-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Linha do tempo</h3>
          {[
            { date: '06/10/2026', event: 'Último acesso', color: 'text-foreground' },
            { date: '01/10/2026', event: 'Renovação assinatura', color: 'text-neural-success' },
            { date: '14/09/2026', event: 'WhatsApp conectado', color: 'text-[#25D366]' },
            { date: '03/09/2026', event: 'Primeiro agente publicado', color: 'text-primary' },
            { date: '01/09/2026', event: 'Cadastro realizado', color: 'text-muted-foreground' },
          ].map(e => (
            <div key={e.date} className="flex items-center gap-3 py-1 border-b border-border/30 last:border-0">
              <span className="text-[10px] text-muted-foreground shrink-0 w-20">{e.date}</span>
              <span className={`text-xs ${e.color}`}>{e.event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabCompany() {
  return (
    <div className="neural-card p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
      {[
        { label: 'Razão social',    value: CLIENT.company,      icon: Building2 },
        { label: 'Nome fantasia',   value: CLIENT.fantasyName,  icon: Building2 },
        { label: 'CNPJ',           value: CLIENT.cnpj,          icon: FileText },
        { label: 'Segmento',       value: CLIENT.segment,       icon: BarChart3 },
        { label: 'Responsável',    value: CLIENT.owner,         icon: Users },
        { label: 'E-mail',         value: CLIENT.email,         icon: Mail },
        { label: 'Telefone',       value: CLIENT.phone,         icon: Phone },
        { label: 'Website',        value: CLIENT.website,       icon: Globe },
        { label: 'País',           value: CLIENT.country,       icon: Globe },
        { label: 'Estado / Cidade',value: `${CLIENT.state} / ${CLIENT.city}`, icon: Globe },
        { label: 'Funcionários',   value: CLIENT.employees,     icon: Users },
        { label: 'Workspace slug', value: CLIENT.tenantSlug,    icon: ArrowUpRight },
      ].map(f => {
        const Icon = f.icon;
        return (
          <div key={f.label} className="flex items-start gap-3">
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
              <p className="text-sm text-foreground font-medium">{f.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabUsers() {
  const users = [
    { name: 'Ricardo Alves',   email: 'admin@techsol.com',  role: 'Admin',     lastSeen: '06/10/2026', status: 'active' },
    { name: 'Camila Torres',   email: 'camila@techsol.com', role: 'Operador',  lastSeen: '05/10/2026', status: 'active' },
    { name: 'Felipe Braga',    email: 'felipe@techsol.com', role: 'Operador',  lastSeen: '03/10/2026', status: 'active' },
    { name: 'Aline Moreira',   email: 'aline@techsol.com',  role: 'Visualizador', lastSeen: '28/09/2026', status: 'active' },
  ];
  return (
    <div className="neural-card overflow-hidden">
      <table className="data-table">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Último acesso</th><th>Status</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.email}>
              <td className="font-medium text-foreground">{u.name}</td>
              <td className="text-muted-foreground text-sm">{u.email}</td>
              <td><span className="text-xs bg-surface-2 px-2 py-0.5 rounded-full border border-border">{u.role}</span></td>
              <td className="text-muted-foreground text-sm">{u.lastSeen}</td>
              <td><span className="badge-success text-[10px] px-2 py-0.5 rounded-full">Ativo</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabPlan() {
  const plans = [
    { name: 'Starter',      price: 'R$ 197/mês', agents: 1,  users: 2,  conversations: 500,  tokens: '50k',  whatsapp: false, current: false },
    { name: 'Professional', price: 'R$ 497/mês', agents: 5,  users: 10, conversations: 5000, tokens: '500k', whatsapp: true,  current: true },
    { name: 'Business',     price: 'R$ 1.197/mês', agents: 20, users: 50, conversations: 25000, tokens: '2M', whatsapp: true, current: false },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.map(p => (
          <div key={p.name} className={`neural-card p-5 space-y-3 ${p.current ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
            {p.current && <span className="badge-primary text-[10px] px-2 py-0.5 rounded-full">Plano atual</span>}
            <h3 className="text-sm font-display font-bold text-foreground">{p.name}</h3>
            <p className="text-lg font-bold text-primary">{p.price}</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• {p.agents} agente{p.agents > 1 ? 's' : ''}</li>
              <li>• {p.users} usuário{p.users > 1 ? 's' : ''}</li>
              <li>• {p.conversations.toLocaleString()} conversas/mês</li>
              <li>• {p.tokens} tokens IA</li>
              <li>• WhatsApp: {p.whatsapp ? '✓' : '—'}</li>
            </ul>
            {!p.current && (
              <button className="btn-ghost border border-border rounded-lg w-full py-1.5 text-xs">Migrar para este plano</button>
            )}
          </div>
        ))}
      </div>
      <div className="neural-card p-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Ações</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost border border-border rounded-lg px-4 py-2 text-xs flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Prorrogar trial</button>
          <button className="btn-ghost border border-border rounded-lg px-4 py-2 text-xs flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Adicionar limite</button>
          <button className="btn-ghost border border-border rounded-lg px-4 py-2 text-xs text-neural-warning flex items-center gap-1.5"><Pause className="h-3.5 w-3.5" /> Suspender</button>
          <button className="btn-ghost border border-border rounded-lg px-4 py-2 text-xs text-neural-danger flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function TabSubscription() {
  return (
    <div className="space-y-4">
      <div className="neural-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Detalhes da assinatura</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Plano',          value: CLIENT.plan },
            { label: 'Status',         value: 'Ativo' },
            { label: 'MRR',            value: CLIENT.mrr },
            { label: 'ARR',            value: CLIENT.arr },
            { label: 'Próx. cobrança', value: CLIENT.nextBilling },
            { label: 'Desde',          value: CLIENT.createdAt },
          ].map(f => (
            <div key={f.label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
              <p className="text-sm font-semibold text-foreground">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="neural-card p-5 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Ações rápidas</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost border border-border rounded-lg px-4 py-2 text-xs flex items-center gap-1.5"><Edit className="h-3.5 w-3.5" /> Alterar plano</button>
          <button className="btn-ghost border border-border rounded-lg px-4 py-2 text-xs flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Forçar renovação</button>
          <button className="btn-ghost border border-border rounded-lg px-4 py-2 text-xs text-neural-danger flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> Cancelar assinatura</button>
        </div>
      </div>
    </div>
  );
}

function TabInvoices() {
  const invoices = [
    { id: 'INV-2026-010', date: '01/10/2026', amount: 'R$ 497,00', status: 'paid',    pdf: true },
    { id: 'INV-2026-009', date: '01/09/2026', amount: 'R$ 497,00', status: 'paid',    pdf: true },
    { id: 'INV-2026-008', date: '01/08/2026', amount: 'R$ 497,00', status: 'paid',    pdf: true },
    { id: 'INV-2026-007', date: '01/07/2026', amount: 'R$ 197,00', status: 'paid',    pdf: true },
  ];
  return (
    <div className="neural-card overflow-hidden">
      <table className="data-table">
        <thead><tr><th>Fatura</th><th>Data</th><th>Valor</th><th>Status</th><th>PDF</th></tr></thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td className="font-mono text-xs text-foreground">{inv.id}</td>
              <td className="text-muted-foreground text-sm">{inv.date}</td>
              <td className="font-semibold text-foreground">{inv.amount}</td>
              <td><span className="badge-success text-[10px] px-2 py-0.5 rounded-full">Pago</span></td>
              <td><button className="text-xs text-primary hover:underline">Baixar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabUsage() {
  const limits = [
    { label: 'Conversas',    used: 312,   max: 5000,   unit: '' },
    { label: 'Tokens IA',    used: 84200, max: 500000, unit: '' },
    { label: 'Agentes',      used: 3,     max: 5,      unit: '' },
    { label: 'Usuários',     used: 4,     max: 10,     unit: '' },
    { label: 'Campanhas/mês',used: 2,     max: 10,     unit: '' },
    { label: 'Storage',      used: 1.2,   max: 5,      unit: ' GB' },
  ];
  return (
    <div className="space-y-3">
      {limits.map(l => {
        const pct = Math.round((l.used / l.max) * 100);
        const color = pct > 80 ? 'text-neural-danger' : pct > 60 ? 'text-neural-warning' : 'text-neural-success';
        const barColor = pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#22D3EE';
        return (
          <div key={l.label} className="neural-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{l.label}</span>
              <span className={`text-xs font-semibold ${color}`}>{pct}% usado</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {typeof l.used === 'number' && l.used > 100 ? l.used.toLocaleString() : l.used}{l.unit} de {typeof l.max === 'number' && l.max > 100 ? l.max.toLocaleString() : l.max}{l.unit}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TabAgents() {
  const agents = [
    { name: 'Assistente Vendas',    status: 'published', conversations: 212, created: '03/09/2026' },
    { name: 'Suporte Técnico',      status: 'published', conversations: 87,  created: '10/09/2026' },
    { name: 'Qualificador de Leads',status: 'draft',     conversations: 0,   created: '30/09/2026' },
  ];
  return (
    <div className="neural-card overflow-hidden">
      <table className="data-table">
        <thead><tr><th>Agente</th><th>Status</th><th>Conversas 30d</th><th>Criado em</th></tr></thead>
        <tbody>
          {agents.map(a => (
            <tr key={a.name}>
              <td className="font-medium text-foreground">{a.name}</td>
              <td>
                <span className={a.status === 'published' ? 'badge-success text-[10px] px-2 py-0.5 rounded-full' : 'bg-surface-2 text-muted-foreground text-[10px] px-2 py-0.5 rounded-full border border-border'}>
                  {a.status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
              </td>
              <td className="text-sm text-muted-foreground">{a.conversations}</td>
              <td className="text-sm text-muted-foreground">{a.created}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabWhatsApp() {
  return (
    <div className="neural-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10">
          <Smartphone className="h-5 w-5 text-[#25D366]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">WhatsApp conectado</p>
          <p className="text-xs text-muted-foreground">{CLIENT.waNumber}</p>
        </div>
        <span className="ml-auto badge-success text-[10px] px-2 py-0.5 rounded-full">Ativo</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Templates aprovados',  value: '3' },
          { label: 'Templates pendentes',  value: '1' },
          { label: 'Mensagens 30d',        value: '624' },
          { label: 'Taxa entrega',         value: '98.4%' },
          { label: 'Número de telefone',   value: CLIENT.waNumber },
          { label: 'Conta Meta',           value: 'act_1234567890' },
        ].map(f => (
          <div key={f.label}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
            <p className="text-sm font-semibold text-foreground">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleInfoTab({ rows }: { rows: { label: string; value: string; status?: 'ok' | 'error' | 'none' }[] }) {
  return (
    <div className="neural-card p-6 space-y-3">
      {rows.map(r => (
        <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
          <span className="text-sm text-muted-foreground">{r.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{r.value}</span>
            {r.status === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 text-neural-success" />}
            {r.status === 'error' && <AlertTriangle className="h-3.5 w-3.5 text-neural-danger" />}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabAudit() {
  const logs = [
    { date: '06/10 14:22', actor: 'admin@techsol.com', action: 'Configuração do agente atualizada', ip: '189.90.x.x' },
    { date: '05/10 09:11', actor: 'camila@techsol.com', action: 'Contatos importados (245 registros)', ip: '187.11.x.x' },
    { date: '03/10 16:44', actor: 'admin@techsol.com', action: 'Template WhatsApp enviado para aprovação', ip: '189.90.x.x' },
    { date: '01/10 08:00', actor: 'sistema', action: 'Renovação de assinatura processada', ip: '—' },
    { date: '30/09 11:33', actor: 'admin@techsol.com', action: 'Senha alterada', ip: '189.90.x.x' },
  ];
  return (
    <div className="neural-card overflow-hidden">
      <table className="data-table">
        <thead><tr><th>Data</th><th>Ator</th><th>Ação</th><th>IP</th></tr></thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i}>
              <td className="font-mono text-xs text-muted-foreground whitespace-nowrap">{l.date}</td>
              <td className="text-xs text-muted-foreground">{l.actor}</td>
              <td className="text-sm text-foreground">{l.action}</td>
              <td className="font-mono text-xs text-muted-foreground">{l.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabErrors() {
  return (
    <div className="space-y-3">
      <div className="neural-card p-6 flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-neural-success" />
        <p className="text-sm font-semibold text-foreground">Nenhum erro registrado nos últimos 7 dias</p>
        <p className="text-xs text-muted-foreground">Todos os sistemas desta conta estão operando normalmente.</p>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function AdminClientDetailPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { label: statusLabel, className: statusClass, icon: StatusIcon } = STATUS_CONFIG[CLIENT.status];

  function renderTab() {
    switch (activeTab) {
      case 'overview':     return <TabOverview />;
      case 'company':      return <TabCompany />;
      case 'users':        return <TabUsers />;
      case 'plan':         return <TabPlan />;
      case 'subscription': return <TabSubscription />;
      case 'invoices':     return <TabInvoices />;
      case 'usage':        return <TabUsage />;
      case 'agents':       return <TabAgents />;
      case 'whatsapp':     return <TabWhatsApp />;
      case 'integrations': return <SimpleInfoTab rows={[
        { label: 'Google Calendar', value: 'Conectado', status: 'ok' },
        { label: 'Microsoft Teams', value: 'Não conectado', status: 'none' },
        { label: 'Anthropic',       value: 'Via plataforma', status: 'ok' },
        { label: 'WhatsApp',        value: 'Conectado', status: 'ok' },
      ]} />;
      case 'ai':           return <SimpleInfoTab rows={[
        { label: 'Provedor',            value: 'Anthropic (plataforma)' },
        { label: 'Modelo padrão',       value: 'claude-sonnet-4-5' },
        { label: 'Tokens usados 30d',   value: '84.200' },
        { label: 'BYOK',               value: 'Desativado' },
        { label: 'Temperatura padrão',  value: '0.7' },
      ]} />;
      case 'calendars':    return <SimpleInfoTab rows={[
        { label: 'Google Calendar',     value: '2 agendas sincronizadas', status: 'ok' },
        { label: 'Microsoft Calendar',  value: 'Não conectado' },
        { label: 'Reuniões agendadas 30d', value: '14' },
      ]} />;
      case 'campaigns':    return <SimpleInfoTab rows={[
        { label: 'Campanhas ativas',    value: '1' },
        { label: 'Campanhas enviadas',  value: '2' },
        { label: 'Mensagens enviadas',  value: '1.240' },
        { label: 'Taxa de abertura',    value: '68%' },
        { label: 'Opt-outs',           value: '3' },
      ]} />;
      case 'audit':        return <TabAudit />;
      case 'errors':       return <TabErrors />;
      default:             return null;
    }
  }

  return (
    <div className="page-container space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/admin/clientes" className="hover:text-foreground transition-colors">Clientes</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{CLIENT.fantasyName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-bold text-foreground">{CLIENT.company}</h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>
              <StatusIcon className="h-3 w-3" /> {statusLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {CLIENT.plan} · {CLIENT.mrr}/mês · {CLIENT.users} usuários · {CLIENT.agents} agentes · Desde {CLIENT.createdAt}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-ghost border border-border rounded-lg px-3 py-2 text-xs flex items-center gap-1.5">
            <Edit className="h-3.5 w-3.5" /> Editar
          </button>
          <button className="btn-ghost border border-border rounded-lg px-3 py-2 text-xs flex items-center gap-1.5 text-neural-warning">
            <Pause className="h-3.5 w-3.5" /> Suspender
          </button>
          <button className="btn-ghost border border-border rounded-lg px-3 py-2 text-xs flex items-center gap-1.5 text-neural-danger">
            <Ban className="h-3.5 w-3.5" /> Cancelar
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 overflow-x-auto pb-0 border-b border-border" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>{renderTab()}</div>
    </div>
  );
}
