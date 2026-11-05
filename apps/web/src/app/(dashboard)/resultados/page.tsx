'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Users,
  BarChart3,
  Zap,
  Download,
  AlertCircle,
  ArrowRight,
  Target,
  Clock,
  ThumbsUp,
} from 'lucide-react';

/* ── Types ── */
type Period = '7d' | '30d' | '90d' | 'custom';

/* ── Sparkline (CSS-based mini chart) ── */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-8">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Bar chart (CSS) ── */
function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{d.value}</span>
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${(d.value / max) * 88}px`,
              background: d.color ?? 'hsl(var(--neural-violet))',
              opacity: 0.85,
            }}
          />
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── KPI card ── */
function KpiCard({
  label,
  value,
  delta,
  deltaPositive,
  icon: Icon,
  iconColor,
  iconBg,
  sparkline,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sparkline?: number[];
}) {
  return (
    <div className="stat-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-display font-semibold text-foreground">{value}</p>
          {delta && (
            <p
              className={`text-xs flex items-center gap-0.5 mt-0.5 ${deltaPositive ? 'text-neural-success' : 'text-neural-danger'}`}
            >
              {deltaPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta} vs. período anterior
            </p>
          )}
        </div>
        {sparkline && (
          <Sparkline values={sparkline} color={deltaPositive !== false ? '#10B981' : '#EF4444'} />
        )}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function ResultadosPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [activeAgent, setActiveAgent] = useState<string>('all');

  const PERIOD_LABELS: Record<Period, string> = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    '90d': 'Últimos 90 dias',
    custom: 'Personalizado',
  };

  /* ── Demo data ── */
  const kpis = [
    {
      label: 'Leads contatados',
      value: '1.847',
      delta: '+18%',
      deltaPositive: true,
      icon: Users,
      iconColor: 'text-neural-violet',
      iconBg: 'bg-neural-violet/10',
      sparkline: [40, 55, 48, 72, 65, 80, 75, 90, 85, 100],
    },
    {
      label: 'Respostas recebidas',
      value: '612',
      delta: '+23%',
      deltaPositive: true,
      icon: MessageSquare,
      iconColor: 'text-neural-blue',
      iconBg: 'bg-neural-blue/10',
      sparkline: [20, 28, 35, 40, 38, 50, 55, 60, 58, 70],
    },
    {
      label: 'Taxa de resposta',
      value: '33,1%',
      delta: '+4,2 pp',
      deltaPositive: true,
      icon: TrendingUp,
      iconColor: 'text-neural-cyan',
      iconBg: 'bg-neural-cyan/10',
      sparkline: [25, 27, 29, 30, 28, 32, 33, 34, 33, 35],
    },
    {
      label: 'Conversas qualificadas',
      value: '284',
      delta: '+31%',
      deltaPositive: true,
      icon: CheckCircle2,
      iconColor: 'text-neural-success',
      iconBg: 'bg-neural-success/10',
      sparkline: [10, 15, 18, 22, 20, 28, 30, 35, 32, 40],
    },
    {
      label: 'Reuniões agendadas',
      value: '47',
      delta: '+12%',
      deltaPositive: true,
      icon: Calendar,
      iconColor: 'text-neural-warning',
      iconBg: 'bg-neural-warning/10',
      sparkline: [3, 4, 5, 6, 4, 7, 8, 6, 7, 8],
    },
    {
      label: 'Taxa de conversão',
      value: '2,5%',
      delta: '+0,4 pp',
      deltaPositive: true,
      icon: Target,
      iconColor: 'text-neural-violet',
      iconBg: 'bg-neural-violet/10',
      sparkline: [1.5, 1.8, 2.0, 2.1, 1.9, 2.2, 2.3, 2.4, 2.4, 2.5],
    },
    {
      label: 'Opt-outs',
      value: '23',
      delta: '-15%',
      deltaPositive: true,
      icon: AlertCircle,
      iconColor: 'text-neural-danger',
      iconBg: 'bg-neural-danger/10',
      sparkline: [8, 7, 6, 5, 6, 4, 4, 3, 3, 2],
    },
    {
      label: 'Tempo médio de resp.',
      value: '4m 12s',
      delta: '-30%',
      deltaPositive: true,
      icon: Clock,
      iconColor: 'text-neural-cyan',
      iconBg: 'bg-neural-cyan/10',
      sparkline: [10, 9, 8, 7, 7, 6, 6, 5, 5, 4],
    },
  ];

  const agentPerformance = [
    {
      name: 'Agente Demo',
      contacts: 1847,
      responseRate: '33%',
      qualified: 284,
      meetings: 47,
      conversion: '2.5%',
      avgTime: '4m',
      score: 9.2,
    },
  ];

  const campaignPerformance = [
    {
      name: 'Campanha Outubro',
      segment: 'Leads Novos',
      sent: 500,
      delivered: 487,
      replied: 162,
      qualified: 98,
      meetings: 18,
      optout: 8,
      status: 'running',
      roi: '+240%',
    },
    {
      name: 'Outreach SDR',
      segment: 'Prospects',
      sent: 1347,
      delivered: 1302,
      replied: 450,
      qualified: 186,
      meetings: 29,
      optout: 15,
      status: 'completed',
      roi: '+180%',
    },
  ];

  const weeklyData = [
    { label: 'Seg', value: 42 },
    { label: 'Ter', value: 65 },
    { label: 'Qua', value: 58 },
    { label: 'Qui', value: 80 },
    { label: 'Sex', value: 72 },
    { label: 'Sáb', value: 18 },
    { label: 'Dom', value: 12 },
  ];

  const funnelData = [
    { label: 'Enviados', value: 1847, color: 'hsl(var(--neural-violet))' },
    { label: 'Entregues', value: 1789, color: 'hsl(var(--neural-blue))' },
    { label: 'Respostas', value: 612, color: 'hsl(var(--neural-cyan))' },
    { label: 'Qualificados', value: 284, color: 'hsl(var(--neural-success))' },
    { label: 'Reuniões', value: 47, color: 'hsl(var(--neural-warning))' },
  ];

  return (
    <div className="page-container space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Resultados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance operacional, comercial e de agentes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-0.5 rounded-lg bg-surface-2 border border-border p-0.5">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Agent filter */}
          <select
            value={activeAgent}
            onChange={(e) => setActiveAgent(e.target.value)}
            className="rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-sm text-foreground"
          >
            <option value="all">Todos os agentes</option>
            <option value="demo">Agente Demo</option>
          </select>
          <button className="btn-ghost rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          KPIs PRINCIPAIS — {PERIOD_LABELS[period]}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="neural-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Respostas por dia</h3>
            <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
          </div>
          <BarChart data={weeklyData} />
        </div>

        <div className="neural-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Funil comercial</h3>
            <span className="text-xs text-muted-foreground">{PERIOD_LABELS[period]}</span>
          </div>
          <div className="space-y-2.5">
            {funnelData.map((item) => {
              const pct = Math.round((item.value / (funnelData[0]?.value ?? 1)) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">
                      {item.value.toLocaleString('pt-BR')} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Agent Performance ── */}
      <div className="neural-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Performance por agente</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Contatos</th>
              <th>Taxa de resposta</th>
              <th>Qualificados</th>
              <th>Reuniões</th>
              <th>Conversão</th>
              <th>Tempo médio</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {agentPerformance.map((a) => (
              <tr key={a.name}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neural-violet/10">
                      <Zap className="h-3.5 w-3.5 text-neural-violet" />
                    </div>
                    <span className="font-medium text-foreground text-sm">{a.name}</span>
                  </div>
                </td>
                <td>{a.contacts.toLocaleString('pt-BR')}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-neural-blue"
                        style={{ width: a.responseRate }}
                      />
                    </div>
                    <span>{a.responseRate}</span>
                  </div>
                </td>
                <td>{a.qualified}</td>
                <td>{a.meetings}</td>
                <td className="text-neural-success font-medium">{a.conversion}</td>
                <td>{a.avgTime}</td>
                <td>
                  <span className="badge-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold">
                    ★ {a.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Campaign Performance ── */}
      <div className="neural-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Performance de campanhas</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Enviados</th>
              <th>Respondidos</th>
              <th>Qualificados</th>
              <th>Reuniões</th>
              <th>Opt-out</th>
              <th>ROI</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {campaignPerformance.map((c) => (
              <tr key={c.name}>
                <td>
                  <p className="font-medium text-foreground text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.segment}</p>
                </td>
                <td>
                  <p>{c.sent.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.delivered.toLocaleString('pt-BR')} entregues
                  </p>
                </td>
                <td>{c.replied}</td>
                <td>{c.qualified}</td>
                <td>{c.meetings}</td>
                <td className="text-neural-warning">{c.optout}</td>
                <td className="text-neural-success font-semibold">{c.roi}</td>
                <td>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      c.status === 'running'
                        ? 'badge-primary'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {c.status === 'running' ? 'Em execução' : 'Concluída'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── AI Insights + Executive Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="neural-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-neural-violet/10 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-neural-violet" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Insights da IA</h3>
          </div>
          {[
            {
              icon: ThumbsUp,
              color: 'text-neural-success',
              bg: 'bg-neural-success/10',
              text: 'Agente Demo teve o melhor desempenho do período com 33% de taxa de resposta',
            },
            {
              icon: Clock,
              color: 'text-neural-blue',
              bg: 'bg-neural-blue/10',
              text: 'Horário de maior engajamento: terças e quintas entre 10h–12h',
            },
            {
              icon: Target,
              color: 'text-neural-warning',
              bg: 'bg-neural-warning/10',
              text: 'Segmento "Leads Novos" tem 2× mais conversão que a média',
            },
            {
              icon: AlertCircle,
              color: 'text-neural-danger',
              bg: 'bg-neural-danger/10',
              text: '3 campanhas com baixa resposta (<15%) — revisar abordagem e template',
            },
          ].map((insight, i) => {
            const Icon = insight.icon;
            return (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-surface-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${insight.bg}`}
                >
                  <Icon className={`h-3 w-3 ${insight.color}`} />
                </span>
                <p className="text-sm text-muted-foreground">{insight.text}</p>
              </div>
            );
          })}
        </div>

        <div className="neural-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-neural-blue/10 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-neural-blue" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Resumo executivo</h3>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-neural-success/5 border border-neural-success/20">
              <p className="text-xs font-semibold text-neural-success mb-1">O que melhorou</p>
              <p className="text-sm text-muted-foreground">
                Taxa de resposta aumentou 4,2 pp. Reuniões agendadas cresceram 12%. Opt-outs caíram
                15%.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-neural-warning/5 border border-neural-warning/20">
              <p className="text-xs font-semibold text-neural-warning mb-1">Atenção</p>
              <p className="text-sm text-muted-foreground">
                2 campanhas abaixo da meta de resposta. Considerar revisão de template e
                segmentação.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-neural-violet/5 border border-neural-violet/20">
              <p className="text-xs font-semibold text-neural-violet mb-1">
                Próximas ações recomendadas
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  Expandir Campanha Outubro para mais 500 leads
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  Testar novo template para segmento B2B
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  Ativar follow-up automático para leads qualificados
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
