'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Wallet, Building2, Smartphone } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Account {
  id: string;
  name: string;
  type: string;
  bankName?: string;
  accountNumber?: string;
  initialBalance: string;
  active: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CAIXA: <Wallet size={20} className="text-green-600" />,
  BANCO: <Building2 size={20} className="text-blue-600" />,
  DIGITAL: <Smartphone size={20} className="text-purple-600" />,
};

export default function ContasPage() {
  const [orgId, setOrgId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'CAIXA', bankName: '', accountNumber: '', initialBalance: '0' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('selectedOrgId');
    if (stored) setOrgId(stored);
  }, []);

  async function fetchAccounts() {
    if (!orgId) return;
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/financeiro/contas?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setAccounts(await r.json());
  }

  useEffect(() => { fetchAccounts(); }, [orgId]);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/financeiro/contas?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, initialBalance: parseFloat(form.initialBalance), bankName: form.bankName || undefined, accountNumber: form.accountNumber || undefined }),
    });
    setSaving(false);
    if (r.ok) { setShowForm(false); fetchAccounts(); }
    else alert((await r.json()).message ?? 'Erro');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/financeiro" className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Financeiras</h1>
          <p className="text-sm text-gray-500">Caixas, bancos e contas digitais</p>
        </div>
        <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Nova Conta
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Nova Conta</h2>
          <form onSubmit={saveAccount} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="CAIXA">Caixa</option>
                <option value="BANCO">Banco</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
              <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="ex: Nubank, Itaú"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder="Número da conta"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Inicial (R$)</label>
              <input type="number" step="0.01" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
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

      <div className="grid grid-cols-3 gap-4">
        {accounts.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">Nenhuma conta cadastrada</div>
        )}
        {accounts.map((a) => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              {TYPE_ICONS[a.type] ?? <Wallet size={20} />}
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-gray-500">{a.type}{a.bankName ? ` · ${a.bankName}` : ''}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Saldo inicial</p>
            <p className="text-xl font-bold">{parseFloat(a.initialBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            {a.accountNumber && <p className="text-xs text-gray-400 mt-2 font-mono">{a.accountNumber}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
