'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  RefreshCw,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Balance {
  id: string;
  itemId: string;
  unitId: string;
  quantity: string;
  reservedQty: string;
  item: { id: string; name: string; unitOfMeasure: string; minStock?: string; code?: string; category?: { name: string } };
}

interface Alert {
  id: string;
  quantity: string;
  item: { name: string; minStock: string; unitOfMeasure: string };
}

export default function EstoquePage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tab, setTab] = useState<'balances' | 'alerts'>('balances');
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
      const headers = { Authorization: `Bearer ${token}` };
      const [balRes, alertRes] = await Promise.all([
        fetch(`${API}/estoque/saldos?organizationId=${orgId}${unitId ? `&unitId=${unitId}` : ''}`, { headers }),
        fetch(`${API}/estoque/alertas?organizationId=${orgId}`, { headers }),
      ]);
      if (balRes.ok) setBalances(await balRes.json());
      if (alertRes.ok) setAlerts(await alertRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [orgId, unitId]);

  const available = (b: Balance) =>
    (parseFloat(b.quantity) - parseFloat(b.reservedQty)).toFixed(4);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500 mt-1">Saldos, movimentações e transferências</p>
        </div>
        <div className="flex gap-2">
          <Link href="/estoque/movimentacoes" className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <TrendingDown size={16} /> Movimentações
          </Link>
          <Link href="/estoque/transferencias" className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <ArrowRightLeft size={16} /> Transferências
          </Link>
          <Link href="/estoque/itens" className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Package size={16} /> Itens
          </Link>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-amber-800">{alerts.length} item(s) abaixo do estoque mínimo</p>
            <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
              {alerts.slice(0, 5).map((a) => (
                <li key={a.id}>{a.item.name} — atual: {parseFloat(a.quantity).toFixed(2)}, mín: {parseFloat(a.item.minStock).toFixed(2)} {a.item.unitOfMeasure}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex gap-4">
            <button onClick={() => setTab('balances')} className={`text-sm font-medium pb-1 ${tab === 'balances' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
              Saldos ({balances.length})
            </button>
            <button onClick={() => setTab('alerts')} className={`text-sm font-medium pb-1 ${tab === 'alerts' ? 'border-b-2 border-amber-600 text-amber-600' : 'text-gray-500'}`}>
              Alertas ({alerts.length})
            </button>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {tab === 'balances' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Código', 'Item', 'Categoria', 'Unidade Med.', 'Quantidade', 'Reservado', 'Disponível'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {balances.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum saldo registrado</td></tr>
                )}
                {balances.map((b) => {
                  const avail = parseFloat(available(b));
                  const isLow = b.item.minStock && parseFloat(b.quantity) <= parseFloat(b.item.minStock);
                  return (
                    <tr key={b.id} className={`hover:bg-gray-50 ${isLow ? 'bg-amber-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.item.code ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">{b.item.name}</td>
                      <td className="px-4 py-3 text-gray-500">{b.item.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{b.item.unitOfMeasure}</td>
                      <td className="px-4 py-3 font-mono">{parseFloat(b.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{parseFloat(b.reservedQty).toFixed(2)}</td>
                      <td className={`px-4 py-3 font-mono font-medium ${avail <= 0 ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
                        {avail.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'alerts' && (
          <div className="divide-y">
            {alerts.length === 0 && (
              <p className="px-4 py-8 text-center text-gray-400">Nenhum alerta de estoque</p>
            )}
            {alerts.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-500" />
                <div>
                  <p className="font-medium text-gray-900">{a.item.name}</p>
                  <p className="text-sm text-gray-500">
                    Atual: {parseFloat(a.quantity).toFixed(2)} {a.item.unitOfMeasure} · Mínimo: {parseFloat(a.item.minStock).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
