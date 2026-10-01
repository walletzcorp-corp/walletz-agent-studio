'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Dashboard {
  period: { year: number; month: number };
  receitas: { total: string; recebido: string; pendente: string };
  despesas: { total: string; pago: string; pendente: string };
  saldo: string;
  vencidos: number;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinanceiroDashboard() {
  const now = new Date();
  const [orgId, setOrgId] = useState('');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('selectedOrgId');
    if (stored) setOrgId(stored);
  }, []);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch(`${API}/financeiro/dashboard?organizationId=${orgId}&year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); });
  }, [orgId, year, month]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500">Receitas, despesas e fluxo de caixa</p>
        </div>
        <div className="flex gap-2">
          <Link href="/financeiro/contas" className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Contas</Link>
          <Link href="/financeiro/lancamentos" className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Lançamentos</Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></button>
        <span className="text-lg font-semibold w-36 text-center">{MONTHS[month - 1]} / {year}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} /></button>
      </div>

      {loading && <p className="text-center text-gray-400 py-12">Carregando...</p>}

      {data && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <TrendingUp size={20} />
                <span className="text-sm font-medium">Receitas</span>
              </div>
              <p className="text-2xl font-bold">{fmt(data.receitas.total)}</p>
              <p className="text-sm text-gray-500 mt-1">Recebido: {fmt(data.receitas.recebido)}</p>
              <p className="text-sm text-red-500">Pendente: {fmt(data.receitas.pendente)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <TrendingDown size={20} />
                <span className="text-sm font-medium">Despesas</span>
              </div>
              <p className="text-2xl font-bold">{fmt(data.despesas.total)}</p>
              <p className="text-sm text-gray-500 mt-1">Pago: {fmt(data.despesas.pago)}</p>
              <p className="text-sm text-red-500">Pendente: {fmt(data.despesas.pendente)}</p>
            </div>
            <div className={`border rounded-xl p-5 ${parseFloat(data.saldo) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`flex items-center gap-2 mb-2 ${parseFloat(data.saldo) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                <DollarSign size={20} />
                <span className="text-sm font-medium">Saldo do Período</span>
              </div>
              <p className={`text-2xl font-bold ${parseFloat(data.saldo) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmt(data.saldo)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Recebido − Pago</p>
            </div>
            {data.vencidos > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <AlertCircle size={20} />
                  <span className="text-sm font-medium">Vencidos</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{data.vencidos}</p>
                <p className="text-sm text-amber-600 mt-1">lançamentos em atraso</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
