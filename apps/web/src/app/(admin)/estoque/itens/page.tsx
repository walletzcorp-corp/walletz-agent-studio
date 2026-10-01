'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronLeft } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Item {
  id: string;
  code?: string;
  name: string;
  unitOfMeasure: string;
  type: string;
  active: boolean;
  category?: { name: string };
  minStock?: string;
}

interface Category { id: string; name: string }

const TYPES: Record<string, string> = {
  CONSUMIVEL: 'Consumível',
  MEDICAMENTO: 'Medicamento',
  EQUIPAMENTO: 'Equipamento',
  MATERIAL: 'Material',
};

export default function EstoqueItensPage() {
  const [orgId, setOrgId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', unitOfMeasure: 'UN', type: 'CONSUMIVEL',
    categoryId: '', description: '', minStock: '', maxStock: '',
    requiresLot: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('selectedOrgId');
    if (stored) setOrgId(stored);
  }, []);

  async function fetchItems() {
    if (!orgId) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams({ organizationId: orgId });
    if (search) qs.set('search', search);
    const r = await fetch(`${API}/estoque/itens?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }

  async function fetchCategories() {
    if (!orgId) return;
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/estoque/categorias?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setCategories(await r.json());
  }

  useEffect(() => { fetchItems(); fetchCategories(); }, [orgId]);
  useEffect(() => { fetchItems(); }, [search]);

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('token');
    const r = await fetch(`${API}/estoque/itens?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...form,
        categoryId: form.categoryId || undefined,
        minStock: form.minStock ? parseFloat(form.minStock) : undefined,
        maxStock: form.maxStock ? parseFloat(form.maxStock) : undefined,
      }),
    });
    setSaving(false);
    if (r.ok) { setShowForm(false); setForm({ name: '', code: '', unitOfMeasure: 'UN', type: 'CONSUMIVEL', categoryId: '', description: '', minStock: '', maxStock: '', requiresLot: false }); fetchItems(); }
    else alert((await r.json()).message ?? 'Erro ao salvar item');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/estoque" className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Itens de Estoque</h1>
          <p className="text-sm text-gray-500">Cadastro de insumos, medicamentos e materiais</p>
        </div>
        <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Novo Item
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4">Novo Item</h2>
          <form onSubmit={saveItem} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de Medida *</label>
              <select value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {['UN', 'ML', 'MG', 'G', 'KG', 'L', 'CX', 'FR', 'AMP', 'CP'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">— Sem categoria —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
              <input type="number" step="0.0001" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="requiresLot" checked={form.requiresLot} onChange={(e) => setForm({ ...form, requiresLot: e.target.checked })} />
              <label htmlFor="requiresLot" className="text-sm text-gray-700">Exige controle de lote</label>
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Código', 'Nome', 'Tipo', 'Categoria', 'UoM', 'Mín.', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum item cadastrado</td></tr>}
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">{TYPES[item.type] ?? item.type}</span></td>
                  <td className="px-4 py-3 text-gray-500">{item.category?.name ?? '—'}</td>
                  <td className="px-4 py-3">{item.unitOfMeasure}</td>
                  <td className="px-4 py-3 font-mono">{item.minStock ? parseFloat(item.minStock).toFixed(2) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
