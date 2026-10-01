'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingUp, Ticket, BarChart2, RefreshCw, ArrowRight } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Metrics {
  leads: { total: number; converted: number; conversionRate: number };
  opportunities: { total: number; won: number; wonRevenue: string | number };
  avgSalesCycleDays: number;
  tickets: { total: number; open: number };
}

interface Opportunity {
  id: string; title: string; status: string; probability: number; value?: string;
  stage: { name: string }; funnel: { name: string };
  lead?: { name: string };
}

export default function CrmPage() {
  const [orgId, setOrgId] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { const s = localStorage.getItem('selectedOrgId'); if (s) setOrgId(s); }, []);

  async function fetchData() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const h = { Authorization: `Bearer ${token}` };
      const [mRes, oRes] = await Promise.all([
        fetch(`${API}/crm/metricas?organizationId=${orgId}`, { headers: h }),
        fetch(`${API}/crm/oportunidades?organizationId=${orgId}`, { headers: h }),
      ]);
      if (mRes.ok) setMetrics(await mRes.json());
      if (oRes.ok) setOpps(await oRes.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchData(); }, [orgId]);

  const fmt = (v: string | number) =>
    parseFloat(String(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const statusColor: Record<string, string> = {
    ABERTA: 'bg-blue-100 text-blue-700',
    GANHA: 'bg-green-100 text-green-700',
    PERDIDA: 'bg-red-100 text-red-700',
    PAUSADA: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Leads, funis, oportunidades e atendimento</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/leads" className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Users size={16} /> Leads
          </Link>
          <Link href="/crm/tickets" className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Ticket size={16} /> Tickets
          </Link>
          <Link href="/crm/templates" className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <BarChart2 size={16} /> Templates
          </Link>
          <button onClick={fetchData} className="p-2 border rounded-lg hover:bg-gray-50" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Leads', value: metrics.leads.total.toString(), sub: `${metrics.leads.conversionRate}% convertidos`, color: 'text-blue-600' },
            { label: 'Oportunidades Ganhas', value: metrics.opportunities.won.toString(), sub: `de ${metrics.opportunities.total}`, color: 'text-green-600' },
            { label: 'Receita CRM', value: fmt(metrics.opportunities.wonRevenue), sub: 'oportunidades ganhas', color: 'text-emerald-600' },
            { label: 'Tickets em Aberto', value: metrics.tickets.open.toString(), sub: `de ${metrics.tickets.total} total`, color: metrics.tickets.open > 5 ? 'text-red-600' : 'text-gray-700' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Oportunidades abertas */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Oportunidades</h2>
          <Link href="/crm/leads" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
            Ver leads <ArrowRight size={14} />
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Título', 'Lead', 'Funil / Etapa', 'Probabilidade', 'Valor', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {opps.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma oportunidade criada</td></tr>
            )}
            {opps.slice(0, 20).map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{o.title}</td>
                <td className="px-4 py-3 text-gray-500">{o.lead?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <p>{o.funnel.name}</p>
                  <p className="text-xs text-gray-500">{o.stage.name}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                      <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${o.probability}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{o.probability}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-700">{o.value ? fmt(o.value) : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor[o.status] ?? 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
