'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Claim {
  id: string; status: string; claimReason: string; glosedValue: string; responsibleParty: string;
  itemDescription: string; claimCode?: string; notes?: string;
  guide: { id: string; guideType: string; serviceDate: string; contract: { carrier: { name: string } } };
  appeals: Array<{ id: string; appealText: string; submittedAt: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  ABERTA: 'bg-red-100 text-red-700',
  RECURSO: 'bg-orange-100 text-orange-700',
  ACEITA: 'bg-green-100 text-green-700',
  NEGADA: 'bg-gray-100 text-gray-500',
};

export default function GlosasPage() {
  const [orgId, setOrgId] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [appealTarget, setAppealTarget] = useState<string | null>(null);
  const [appealText, setAppealText] = useState('');

  useEffect(() => { const s = localStorage.getItem('selectedOrgId'); if (s) setOrgId(s); }, []);

  async function fetchClaims() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/tis/glosas?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setClaims(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchClaims(); }, [orgId]);

  async function submitAppeal() {
    if (!appealTarget || !appealText) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/tis/glosas/${appealTarget}/recurso?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ appealText }),
    });
    if (res.ok) { setAppealTarget(null); setAppealText(''); fetchClaims(); }
    else alert('Erro ao enviar recurso');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Glosas</h1>
          <p className="text-sm text-gray-500 mt-1">Contestações recebidas das operadoras</p>
        </div>
        <button onClick={fetchClaims} className="p-2 border rounded-lg hover:bg-gray-50" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {appealTarget && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Enviar Recurso</h2>
          <textarea rows={4} value={appealText} onChange={(e) => setAppealText(e.target.value)}
            placeholder="Descreva o argumento do recurso..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2">
            <button onClick={submitAppeal} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Enviar</button>
            <button onClick={() => setAppealTarget(null)} className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Operadora', 'Data Atend.', 'Item Glosado', 'Motivo', 'Valor', 'Responsável', 'Status', 'Recursos', 'Ação'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {claims.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nenhuma glosa registrada</td></tr>
            )}
            {claims.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.guide.contract.carrier.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{new Date(c.guide.serviceDate).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">{c.itemDescription}</td>
                <td className="px-4 py-3 text-gray-500">{c.claimReason}</td>
                <td className="px-4 py-3 font-mono text-red-600 font-medium">
                  {parseFloat(c.glosedValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.responsibleParty}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.appeals.length}</td>
                <td className="px-4 py-3">
                  {!['ACEITA', 'NEGADA'].includes(c.status) && (
                    <button onClick={() => setAppealTarget(c.id)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                      Recurso
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
