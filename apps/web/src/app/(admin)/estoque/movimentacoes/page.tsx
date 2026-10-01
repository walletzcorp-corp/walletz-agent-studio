'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Movement {
  id: string;
  type: string;
  quantity: string;
  reason?: string;
  performedAt: string;
  performedBy: string;
  item: { name: string; unitOfMeasure: string };
  lot?: { lotNumber: string };
}

interface Item { id: string; name: string; unitOfMeasure: string }

const TYPE_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE_POSITIVO: 'Ajuste +', AJUSTE_NEGATIVO: 'Ajuste −',
  PERDA: 'Perda', DESCARTE: 'Descarte', DEVOLUCAO: 'Devolução',
  TRANSFERENCIA_SAIDA: 'Trans. Saída', TRANSFERENCIA_ENTRADA: 'Trans. Entrada',
  RESERVA: 'Reserva', LIBERACAO_RESERVA: 'Lib. Reserva', CONSUMO: 'Consumo',
};

const TYPE_COLORS: Record<string, string> = {
  ENTRADA: 'bg-green-100 text-green-700',
  SAIDA: 'bg-red-100 text-red-700',
  AJUSTE_POSITIVO: 'bg-blue-100 text-blue-700',
  AJUSTE_NEGATIVO: 'bg-orange-100 text-orange-700',
  PERDA: 'bg-red-100 text-red-700',
  DESCARTE: 'bg-gray-100 text-gray-700',
  DEVOLUCAO: 'bg-purple-100 text-purple-700',
  TRANSFERENCIA_SAIDA: 'bg-amber-100 text-amber-700',
  TRANSFERENCIA_ENTRADA: 'bg-cyan-100 text-cyan-700',
  CONSUMO: 'bg-orange-100 text-orange-700',
};

export default function MovimentacoesPage() {
  const [orgId, setOrgId] = useState('');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    itemId: '', unitId: '', type: 'ENTRADA', quantity: '', reason: '', lotId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('selectedOrgId');
    if (stored) setOrgId(stored);
  }, []);

  async function fetchMovements() {
    if (!orgId) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/estoque/movimentacoes?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setMovements(await r.json());
    setLoading(false);
  }

  async function fetchItems() {
    if (!orgId) return;
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/estoque/itens?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setItems(await r.json());
  }

  useEffect(() => { fetchMovements(); fetchItems(); }, [orgId]);

  async function saveMovement(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/estoque/movimentacoes?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, quantity: parseFloat(form.quantity), lotId: form.lotId || undefined }),
    });
    setSaving(false);
    if (r.ok) { setShowForm(false); fetchMovements(); }
    else alert((await r.json()).message ?? 'Erro');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/estoque" className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimentações de Estoque</h1>
          <p className="text-sm text-gray-500">Entradas, saídas e ajustes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Nova Movimentação
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Registrar Movimentação</h2>
          <form onSubmit={saveMovement} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
              <select required value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(TYPE_LABELS).filter(([k]) => !['RESERVA','LIBERACAO_RESERVA','TRANSFERENCIA_SAIDA','TRANSFERENCIA_ENTRADA'].includes(k))
                  .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
              <input required type="number" step="0.0001" min="0.0001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Unidade *</label>
              <input required value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                placeholder="UUID da unidade"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Registrar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border text-sm rounded-lg">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Tipo', 'Item', 'Lote', 'Quantidade', 'Motivo', 'Data'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>}
              {!loading && movements.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma movimentação</td></tr>}
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${TYPE_COLORS[m.type] ?? 'bg-gray-100 text-gray-700'}`}>
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{m.item.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{m.lot?.lotNumber ?? '—'}</td>
                  <td className="px-4 py-3 font-mono">{parseFloat(m.quantity).toFixed(2)} {m.item.unitOfMeasure}</td>
                  <td className="px-4 py-3 text-gray-500">{m.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.performedAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
