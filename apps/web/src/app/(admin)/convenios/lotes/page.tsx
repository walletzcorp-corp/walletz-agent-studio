'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Lot {
  id: string; lotNumber: string; status: string; competenceMonth: number; competenceYear: number;
  totalValue: string; sentAt?: string;
  contract: { carrier: { name: string }; contractNumber: string };
  items: Array<{ id: string; value: string; guide: { id: string; guideType: string } }>;
}

const STATUS_COLOR: Record<string, string> = {
  ABERTO: 'bg-yellow-100 text-yellow-700',
  FECHADO: 'bg-blue-100 text-blue-700',
  ENVIADO: 'bg-green-100 text-green-700',
  ACEITO: 'bg-emerald-100 text-emerald-700',
  RECUSADO: 'bg-red-100 text-red-700',
};

export default function LotesPage() {
  const [orgId, setOrgId] = useState('');
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(false);
  const [xmlResult, setXmlResult] = useState<{ xml: string; note: string } | null>(null);

  useEffect(() => { const s = localStorage.getItem('selectedOrgId'); if (s) setOrgId(s); }, []);

  async function fetchLots() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/tis/lotes?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setLots(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchLots(); }, [orgId]);

  async function closeLot(id: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/tis/lotes/${id}/fechar?organizationId=${orgId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchLots();
    else alert('Erro ao fechar lote');
  }

  async function exportXml(id: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/tis/lotes/${id}/exportar-xml?organizationId=${orgId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setXmlResult(data);
      fetchLots();
    } else alert('Erro ao exportar XML');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lotes de Faturamento</h1>
          <p className="text-sm text-gray-500 mt-1">Lotes TISS para envio às operadoras</p>
        </div>
        <button onClick={fetchLots} className="p-2 border rounded-lg hover:bg-gray-50" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {xmlResult && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="font-medium text-yellow-800 mb-2">XML Gerado — SIMULAÇÃO</p>
          <p className="text-xs text-yellow-700 mb-3">{xmlResult.note}</p>
          <pre className="text-xs bg-white border rounded p-3 overflow-x-auto max-h-48">{xmlResult.xml}</pre>
          <button onClick={() => setXmlResult(null)} className="mt-2 text-xs text-yellow-700 underline">Fechar</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Competência', 'Nº Lote', 'Operadora', 'Guias', 'Total', 'Status', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {lots.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum lote encontrado</td></tr>
            )}
            {lots.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{String(l.competenceMonth).padStart(2, '0')}/{l.competenceYear}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.lotNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{l.contract.carrier.name}</p>
                  <p className="text-xs text-gray-500">{l.contract.contractNumber}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{l.items.length}</td>
                <td className="px-4 py-3 font-mono text-green-600 font-medium">
                  {parseFloat(l.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[l.status] ?? 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {l.status === 'ABERTO' && (
                      <button onClick={() => closeLot(l.id)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                        Fechar
                      </button>
                    )}
                    {l.status === 'FECHADO' && (
                      <button onClick={() => exportXml(l.id)} className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <Download size={12} /> XML (sim.)
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
