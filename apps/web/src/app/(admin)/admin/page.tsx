'use client';

import {
  Users,
  TrendingUp,
  DollarSign,
  Bot,
  MessageSquare,
  Smartphone,
  AlertTriangle,
  Activity,
  UserCheck,
  UserX,
  Clock,
  Zap,
} from 'lucide-react';

/* ── KPI card ── */
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: { dir: 'up' | 'down'; val: string };
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {trend && (
        <p
          className={`text-xs mt-1 font-medium ${trend.dir === 'up' ? 'text-neural-success' : 'text-neural-danger'}`}
        >
          {trend.dir === 'up' ? '↑' : '↓'} {trend.val} vs mês anterior
        </p>
      )}
    </div>
  );
}

/* ── Alert row ── */
function AlertRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{count}</span>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral da plataforma Walletz Agent Studio · Outubro 2026
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-neural-success/30 bg-neural-success/5 px-3 py-1.5">
          <Activity className="h-3.5 w-3.5 text-neural-success" />
          <span className="text-xs text-neural-success font-medium">Plataforma operacional</span>
        </div>
      </div>

      {/* Revenue KPIs */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
          Receita
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="MRR"
            value="R$ 14.910"
            sub="15 clientes ativos"
            icon={DollarSign}
            color="text-neural-success"
            trend={{ dir: 'up', val: '+23%' }}
          />
          <KpiCard
            label="ARR estimado"
            value="R$ 178.920"
            sub="Projeção 12 meses"
            icon={TrendingUp}
            color="text-primary"
            trend={{ dir: 'up', val: '+18%' }}
          />
          <KpiCard
            label="Ticket médio"
            value="R$ 994"
            sub="Por cliente/mês"
            icon={DollarSign}
            color="text-neural-blue"
          />
          <KpiCard
            label="Churn (30 dias)"
            value="0"
            sub="Cancelamentos"
            icon={UserX}
            color="text-neural-success"
          />
        </div>
      </div>

      {/* Customer KPIs */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
          Clientes
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total clientes"
            value="18"
            sub="Todos os status"
            icon={Users}
            color="text-foreground"
          />
          <KpiCard
            label="Ativos"
            value="15"
            sub="Assinatura em dia"
            icon={UserCheck}
            color="text-neural-success"
            trend={{ dir: 'up', val: '+3' }}
          />
          <KpiCard
            label="Trials"
            value="3"
            sub="Nos últimos 30 dias"
            icon={Clock}
            color="text-neural-warning"
          />
          <KpiCard
            label="Inadimplentes"
            value="0"
            sub="Past due"
            icon={AlertTriangle}
            color="text-neural-success"
          />
        </div>
      </div>

      {/* Platform KPIs */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
          Plataforma
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Agentes ativos"
            value="24"
            sub="Total em produção"
            icon={Bot}
            color="text-primary"
            trend={{ dir: 'up', val: '+6' }}
          />
          <KpiCard
            label="Conversas (30 dias)"
            value="4.812"
            sub="Total na plataforma"
            icon={MessageSquare}
            color="text-neural-cyan"
          />
          <KpiCard
            label="WhatsApp conectados"
            value="8"
            sub="Números ativos"
            icon={Smartphone}
            color="text-[#25D366]"
          />
          <KpiCard
            label="Tokens IA (30 dias)"
            value="2.1M"
            sub="Todos os clientes"
            icon={Zap}
            color="text-neural-blue"
          />
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Integrations status */}
        <div className="neural-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Integrações ativas</h3>
          {[
            { label: 'Google Calendar', count: 6, color: 'text-[#4285F4]' },
            { label: 'Microsoft Teams', count: 3, color: 'text-[#5059C9]' },
            { label: 'WhatsApp (Meta)', count: 8, color: 'text-[#25D366]' },
            { label: 'Anthropic', count: 12, color: 'text-primary' },
            { label: 'Gemini', count: 3, color: 'text-neural-blue' },
            { label: 'OpenAI', count: 1, color: 'text-foreground' },
          ].map((i) => (
            <AlertRow key={i.label} {...i} />
          ))}
        </div>

        {/* Alerts */}
        <div className="neural-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alertas da plataforma</h3>
          {[
            { label: 'Erros críticos (24h)', count: 0, color: 'text-neural-success' },
            { label: 'Tokens IA próximo do limite', count: 1, color: 'text-neural-warning' },
            { label: 'WhatsApp sem resposta (>24h)', count: 0, color: 'text-neural-success' },
            { label: 'Trials expirando (7 dias)', count: 2, color: 'text-neural-warning' },
            { label: 'Tokens Meta com erro', count: 0, color: 'text-neural-success' },
            { label: 'Auth expirada (Google/MS)', count: 0, color: 'text-neural-success' },
          ].map((a) => (
            <AlertRow key={a.label} {...a} />
          ))}
        </div>
      </div>

      {/* Recent signups */}
      <div className="neural-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Cadastros recentes</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>E-mail</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                company: 'Tech Solutions',
                email: 'admin@techsol.com',
                plan: 'Professional',
                status: 'active',
                date: '04/10/2026',
              },
              {
                company: 'Saúde Digital',
                email: 'ti@saudedigital.com',
                plan: 'Business',
                status: 'trial',
                date: '03/10/2026',
              },
              {
                company: 'Consultoria XYZ',
                email: 'info@xyz.com',
                plan: 'Starter',
                status: 'trial',
                date: '02/10/2026',
              },
              {
                company: 'Varejo Premium',
                email: 'ti@varejoprem.com',
                plan: 'Professional',
                status: 'active',
                date: '01/10/2026',
              },
            ].map((row) => (
              <tr key={row.email}>
                <td className="font-medium text-foreground">{row.company}</td>
                <td className="text-muted-foreground">{row.email}</td>
                <td>{row.plan}</td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.status === 'active' ? 'badge-success' : 'badge-warning'
                    }`}
                  >
                    {row.status === 'active' ? 'Ativo' : 'Trial'}
                  </span>
                </td>
                <td className="text-muted-foreground">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
