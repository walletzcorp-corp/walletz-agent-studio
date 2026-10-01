'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Search } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Lead {
  id: string; name: string; email?: string; phone?: string; source?: string;
  status: string; consentGiven: boolean; ownedBy?: string; createdAt: string;
  _count?: { opportunities: number; activities: number };
}

const STATUS_COLOR: Record<string, string> = {
  NOVO: 'bg-blue-100 text-blue-700',
  QUALIFICADO: 'bg-indigo-100 text-indigo-700',
  EM_NEGOCIACAO: 'bg-yellow-100 text-yellow-700',
  CONVERTIDO: 'bg-green-100 text-green-700',
  PERDIDO: 'bg-red-100 text-red-700',
  DESCARTADO: 'bg-gray-100 text-gray-500',
};

export default function LeadsPage() {
  const [orgId, setOrgId] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: '', consentGiven: false, consentChannel: 'WEB' });
  const [error, setError] = useState('');

  useEffect(() => { const s = localStorage.getItem('selectedOrgId'); if (s) setOrgId(s); }, []);

  async function fetchLeads() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ organizationId: orgId });
      if (search) params.set('search', search);
      const res = await fetch(`${API}/crm/leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setLeads(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchLeads(); }, [orgId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/crm/leads?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { setCreating(false); setForm({ name: '', email: '', phone: '', source: '', consentGiven: false, consentChannel: 'WEB' }); fetchLeads(); }
    else { const e2 = await res.json(); setError(e2.message ?? 'Erro ao criar lead'); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Contatos e prospectos comerciais</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
              placeholder="Buscar..." className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={fetchLeads} className="p-2 border rounded-lg hover:bg-gray-50" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Novo Lead</h2>
          <p className="text-xs text-gray-500">Comunicação comercial separada de dados assistenciais. Consentimento obrigatório para comunicações.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Nome *', key: 'name' }, { label: 'E-mail', key: 'email' },
              { label: 'Telefone', key: 'phone' }, { label: 'Origem (SITE, INDICACAO...)', key: 'source' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="consent" checked={form.consentGiven}
              onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })} />
            <label htmlFor="consent" className="text-sm text-gray-700">
              Consentimento para comunicações comerciais obtido
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Salvar</button>
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Nome', 'Contato', 'Origem', 'Oportunidades', 'Atividades', 'Consentimento', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum lead cadastrado</td></tr>
            )}
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{l.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {l.email && <p className="text-xs">{l.email}</p>}
                  {l.phone && <p className="text-xs">{l.phone}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500">{l.source ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{l._count?.opportunities ?? 0}</td>
                <td className="px-4 py-3 text-gray-500">{l._count?.activities ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${l.consentGiven ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {l.consentGiven ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[l.status] ?? 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
