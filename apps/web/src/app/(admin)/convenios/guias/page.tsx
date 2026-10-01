'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-700',
  VALIDADO: 'bg-blue-100 text-blue-700',
  ENVIADO: 'bg-indigo-100 text-indigo-700',
  AUTORIZADO: 'bg-green-100 text-green-700',
  NEGADO: 'bg-red-100 text-red-700',
  GLOSADO: 'bg-orange-100 text-orange-700',
  PAGO: 'bg-emerald-100 text-emerald-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
};

interface Guide {
  id: string; guideType: string; status: string; serviceDate: string;
  guideNumber?: string; patientId?: string;
  contract: { carrier: { name: string }; contractNumber: string };
  items: Array<{ description: string; quantity: string; unitValue: string; totalValue: string }>;
  validationErrors?: string[];
}

export default function GuiasPage() {
  const [orgId, setOrgId] = useState('');
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { const s = localStorage.getItem('selectedOrgId'); if (s) setOrgId(s); }, []);

  async function fetchGuides() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ organizationId: orgId });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/tis/guias?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setGuides(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchGuides(); }, [orgId, statusFilter]);

  const totalValue = (g: Guide) =>
    g.items.reduce((s, i) => s + parseFloat(i.totalValue), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guias TISS</h1>
          <p className="text-sm text-gray-500 mt-1">Guias de serviço e SADT por convênio</p>
        </div>
        <button onClick={fetchGuides} className="p-2 border rounded-lg hover:bg-gray-50" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'PENDENTE', 'VALIDADO', 'ENVIADO', 'AUTORIZADO', 'GLOSADO', 'PAGO', 'CANCELADO'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs rounded-full border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {s || 'Todos'}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Data', 'Tipo', 'Operadora / Contrato', 'Nº Guia', 'Itens', 'Total', 'Status', 'Erros'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {guides.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhuma guia encontrada</td></tr>
            )}
            {guides.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{new Date(g.serviceDate).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">{g.guideType}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{g.contract.carrier.name}</p>
                  <p className="text-xs text-gray-500">{g.contract.contractNumber}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{g.guideNumber ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{g.items.length}</td>
                <td className="px-4 py-3 font-mono text-green-600 font-medium">{totalValue(g)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[g.status] ?? 'bg-gray-100 text-gray-600'}`}>{g.status}</span>
                </td>
                <td className="px-4 py-3">
                  {g.validationErrors && g.validationErrors.length > 0 ? (
                    <span className="text-xs text-red-600">{g.validationErrors.length} erro(s)</span>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
