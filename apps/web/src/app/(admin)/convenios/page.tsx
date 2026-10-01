'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, Layers, AlertCircle, RefreshCw, TrendingDown } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Indicator {
  totalGuides: number;
  totalBilled: string;
  totalGlosed: string;
  glosaRate: string;
  openClaims: number;
  byCarrier: Array<{ carrierId: string; name: string; billed: string; glosas: string }>;
}

export default function ConveniosPage() {
  const [orgId, setOrgId] = useState('');
  const [indicators, setIndicators] = useState<Indicator | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('selectedOrgId');
    if (stored) setOrgId(stored);
  }, []);

  async function fetchData() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/tis/indicadores?organizationId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setIndicators(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [orgId]);

  const fmt = (v: string | number) =>
    parseFloat(String(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Convênios / TIS</h1>
          <p className="text-sm text-gray-500 mt-1">Operadoras, guias TISS, lotes e glosas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/convenios/operadoras" className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <ShieldCheck size={16} /> Operadoras
          </Link>
          <Link href="/convenios/guias" className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <FileText size={16} /> Guias
          </Link>
          <Link href="/convenios/lotes" className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Layers size={16} /> Lotes
          </Link>
          <Link href="/convenios/glosas" className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <AlertCircle size={16} /> Glosas
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      {indicators && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total de Guias', value: indicators.totalGuides.toString(), color: 'text-blue-600' },
            { label: 'Faturado', value: fmt(indicators.totalBilled), color: 'text-green-600' },
            { label: 'Glosado', value: fmt(indicators.totalGlosed), color: 'text-red-600' },
            { label: 'Taxa de Glosa', value: `${parseFloat(indicators.glosaRate).toFixed(1)}%`, color: parseFloat(indicators.glosaRate) > 10 ? 'text-red-600' : 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {indicators && indicators.openClaims > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <TrendingDown className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-red-800">{indicators.openClaims} glosa(s) em aberto</p>
            <Link href="/convenios/glosas" className="text-sm text-red-700 underline mt-1 block">Ver glosas →</Link>
          </div>
        </div>
      )}

      {/* Por operadora */}
      {indicators && indicators.byCarrier.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Por Operadora</h2>
            <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Operadora', 'Faturado', 'Glosado', 'Taxa'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {indicators.byCarrier.map((c) => {
                const rate = parseFloat(c.billed) > 0 ? (parseFloat(c.glosas) / parseFloat(c.billed)) * 100 : 0;
                return (
                  <tr key={c.carrierId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-green-600 font-mono">{fmt(c.billed)}</td>
                    <td className="px-4 py-3 text-red-600 font-mono">{fmt(c.glosas)}</td>
                    <td className={`px-4 py-3 font-mono font-medium ${rate > 10 ? 'text-red-600' : 'text-gray-600'}`}>
                      {rate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!indicators && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p>Selecione uma organização para ver os indicadores de convênios.</p>
        </div>
      )}
    </div>
  );
}
