'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, CheckCircle, XCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Transfer {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  status: string;
  notes?: string;
  requestedAt: string;
  receivedAt?: string;
  lines: Array<{ id: string; requestedQty: string; receivedQty?: string; item: { name: string; unitOfMeasure: string } }>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-700',
  ENVIADO: 'bg-blue-100 text-blue-700',
  RECEBIDO: 'bg-green-100 text-green-700',
  DIVERGENCIA: 'bg-orange-100 text-orange-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
};

export default function TransferenciasPage() {
  const [orgId, setOrgId] = useState('');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('selectedOrgId');
    if (stored) setOrgId(stored);
  }, []);

  async function fetchTransfers() {
    if (!orgId) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/estoque/transferencias?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setTransfers(await r.json());
    setLoading(false);
  }

  useEffect(() => { fetchTransfers(); }, [orgId]);

  async function receiveTransfer(id: string, lines: Transfer['lines']) {
    const token = localStorage.getItem('token');
    const dto = { lines: lines.map((l) => ({ lineId: l.id, receivedQty: parseFloat(l.requestedQty) })) };
    const r = await fetch(`${API}/estoque/transferencias/${id}/receber?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
    });
    if (r.ok) fetchTransfers();
    else alert((await r.json()).message ?? 'Erro ao receber transferência');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/estoque" className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transferências entre Unidades</h1>
          <p className="text-sm text-gray-500">Movimentação inter-unidade</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Carregando...</p>
      ) : transfers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>Nenhuma transferência registrada.</p>
          <p className="text-sm mt-1">As transferências são criadas via API.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => (
            <div key={t.id} className="bg-white border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[t.status] ?? 'bg-gray-100'}`}>{t.status}</span>
                  <div>
                    <p className="font-medium text-sm">{t.fromUnitId} → {t.toUnitId}</p>
                    <p className="text-xs text-gray-500">{new Date(t.requestedAt).toLocaleString('pt-BR')} · {t.lines.length} item(s)</p>
                  </div>
                </div>
                {t.status === 'PENDENTE' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); receiveTransfer(t.id, t.lines); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle size={14} /> Confirmar Recebimento
                  </button>
                )}
              </button>
              {expanded === t.id && (
                <div className="border-t px-4 pb-4">
                  {t.notes && <p className="text-sm text-gray-600 pt-3 italic">"{t.notes}"</p>}
                  <table className="w-full text-sm mt-3">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Solicitado</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Recebido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {t.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-2">{l.item.name}</td>
                          <td className="px-3 py-2 text-right font-mono">{parseFloat(l.requestedQty).toFixed(2)} {l.item.unitOfMeasure}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-500">{l.receivedQty ? parseFloat(l.receivedQty).toFixed(2) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
