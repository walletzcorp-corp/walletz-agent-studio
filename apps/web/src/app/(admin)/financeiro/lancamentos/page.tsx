'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, CreditCard, RotateCcw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Transaction {
  id: string;
  type: string;
  status: string;
  description: string;
  amount: string;
  paidAmount: string;
  dueDate: string;
  category?: { name: string };
  payments: Array<{ id: string; amount: string; method: string; paidAt: string; reversedAt?: string }>;
}

interface Category { id: string; name: string; type: string }

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-700',
  PARCIALMENTE_PAGO: 'bg-blue-100 text-blue-700',
  PAGO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
  VENCIDO: 'bg-red-100 text-red-700',
};

function fmt(v: string | number) {
  return parseFloat(String(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function LancamentosPage() {
  const [orgId, setOrgId] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState<string | null>(null);
  const [form, setForm] = useState({ description: '', amount: '', type: 'RECEITA', dueDate: '', categoryId: '', notes: '' });
  const [payForm, setPayForm] = useState({ amount: '', method: 'PIX' });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('selectedOrgId');
    if (stored) setOrgId(stored);
  }, []);

  async function fetchTransactions() {
    if (!orgId) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams({ organizationId: orgId });
    if (statusFilter) qs.set('status', statusFilter);
    if (typeFilter) qs.set('type', typeFilter);
    const r = await fetch(`${API}/financeiro/lancamentos?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setTransactions(await r.json());
    setLoading(false);
  }

  async function fetchCategories() {
    if (!orgId) return;
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/financeiro/categorias?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setCategories(await r.json());
  }

  useEffect(() => { fetchTransactions(); fetchCategories(); }, [orgId]);
  useEffect(() => { fetchTransactions(); }, [statusFilter, typeFilter]);

  async function saveTx(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/financeiro/lancamentos?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), categoryId: form.categoryId || undefined }),
    });
    setSaving(false);
    if (r.ok) { setShowForm(false); fetchTransactions(); }
    else alert((await r.json()).message ?? 'Erro');
  }

  async function savePayment(txId: string) {
    setSaving(true);
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/financeiro/lancamentos/${txId}/pagamentos?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: parseFloat(payForm.amount), method: payForm.method }),
    });
    setSaving(false);
    if (r.ok) { setShowPayForm(null); fetchTransactions(); }
    else alert((await r.json()).message ?? 'Erro');
  }

  async function reversePayment(paymentId: string) {
    const reason = prompt('Motivo do estorno:');
    if (!reason) return;
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/financeiro/pagamentos/${paymentId}/estornar?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    if (r.ok) fetchTransactions();
    else alert((await r.json()).message ?? 'Erro ao estornar');
  }

  const filteredCats = categories.filter((c) => !form.type || c.type === form.type);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/financeiro" className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos Financeiros</h1>
          <p className="text-sm text-gray-500">Contas a receber e a pagar</p>
        </div>
        <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Novo Lançamento</h2>
          <form onSubmit={saveTx} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
              <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento *</label>
              <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">— Sem categoria —</option>
                {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border text-sm rounded-lg">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {['PENDENTE','PARCIALMENTE_PAGO','PAGO','CANCELADO','VENCIDO'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Receitas + Despesas</option>
          <option value="RECEITA">Receitas</option>
          <option value="DESPESA">Despesas</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-center text-gray-400 py-8">Carregando...</p>}
        {!loading && transactions.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum lançamento</p>}
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-white border rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[tx.status] ?? 'bg-gray-100'}`}>{tx.status.replace('_', ' ')}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${tx.type === 'RECEITA' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{tx.type}</span>
                <div>
                  <p className="font-medium text-sm">{tx.description}</p>
                  <p className="text-xs text-gray-500">{tx.category?.name ?? 'Sem categoria'} · Vence: {new Date(tx.dueDate).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{fmt(tx.amount)}</p>
                {parseFloat(tx.paidAmount) > 0 && <p className="text-xs text-green-600">Pago: {fmt(tx.paidAmount)}</p>}
              </div>
            </button>
            {expanded === tx.id && (
              <div className="border-t p-4 space-y-3">
                {tx.payments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Pagamentos</p>
                    {tx.payments.map((p) => (
                      <div key={p.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${p.reversedAt ? 'opacity-50' : ''}`}>
                        <div>
                          <span className="text-sm font-medium">{fmt(p.amount)}</span>
                          <span className="text-xs text-gray-500 ml-2">{p.method} · {new Date(p.paidAt).toLocaleDateString('pt-BR')}</span>
                          {p.reversedAt && <span className="ml-2 text-xs text-red-600">ESTORNADO</span>}
                        </div>
                        {!p.reversedAt && (
                          <button onClick={() => reversePayment(p.id)} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
                            <RotateCcw size={12} /> Estornar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!['PAGO', 'CANCELADO'].includes(tx.status) && (
                  showPayForm === tx.id ? (
                    <div className="flex gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor</label>
                        <input type="number" step="0.01" min="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Forma</label>
                        <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                          {['PIX','DINHEIRO','CARTAO_CREDITO','CARTAO_DEBITO','TRANSFERENCIA','CONVENIO'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                        </select>
                      </div>
                      <button onClick={() => savePayment(tx.id)} disabled={saving} className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {saving ? '...' : 'Registrar'}
                      </button>
                      <button onClick={() => setShowPayForm(null)} className="px-3 py-2 border text-sm rounded-lg">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => { setShowPayForm(tx.id); setPayForm({ amount: String(parseFloat(tx.amount) - parseFloat(tx.paidAmount)), method: 'PIX' }); }}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                      <CreditCard size={16} /> Registrar Pagamento
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
