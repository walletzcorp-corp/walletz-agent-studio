'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Carrier { id: string; ansCode: string; name: string; tradeName?: string; cnpj?: string; phone?: string; email?: string; active: boolean; plans: Array<{ id: string; name: string; planCode: string; planType: string }> }

export default function OperadorasPage() {
  const [orgId, setOrgId] = useState('');
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ansCode: '', name: '', tradeName: '', cnpj: '', phone: '', email: '' });
  const [error, setError] = useState('');

  useEffect(() => { const s = localStorage.getItem('selectedOrgId'); if (s) setOrgId(s); }, []);

  async function fetchCarriers() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/tis/operadoras?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCarriers(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchCarriers(); }, [orgId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/tis/operadoras?organizationId=${orgId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { setCreating(false); setForm({ ansCode: '', name: '', tradeName: '', cnpj: '', phone: '', email: '' }); fetchCarriers(); }
    else { const e2 = await res.json(); setError(e2.message ?? 'Erro ao criar operadora'); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operadoras</h1>
          <p className="text-sm text-gray-500 mt-1">Convênios cadastrados nesta organização</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCarriers} className="p-2 border rounded-lg hover:bg-gray-50" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Nova Operadora
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nova Operadora</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Código ANS *', key: 'ansCode', placeholder: '000000' },
              { label: 'Nome *', key: 'name', placeholder: 'Razão Social' },
              { label: 'Nome Fantasia', key: 'tradeName', placeholder: 'Nome Fantasia' },
              { label: 'CNPJ', key: 'cnpj', placeholder: '00.000.000/0001-00' },
              { label: 'Telefone', key: 'phone', placeholder: '' },
              { label: 'E-mail', key: 'email', placeholder: '' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Salvar</button>
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Código ANS', 'Nome', 'Nome Fantasia', 'CNPJ', 'Planos', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {carriers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma operadora cadastrada</td></tr>
            )}
            {carriers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{c.ansCode}</td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.tradeName ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.cnpj ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.plans.length}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
