'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Ticket {
  id: string; subject: string; status: string; priority: string; channel?: string;
  category?: string; slaDeadline?: string; createdAt: string;
  messages: Array<{ id: string; body: string; authorName: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  ABERTO: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  AGUARDANDO_CLIENTE: 'bg-purple-100 text-purple-700',
  RESOLVIDO: 'bg-green-100 text-green-700',
  FECHADO: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLOR: Record<string, string> = {
  BAIXA: 'text-green-600', MEDIA: 'text-yellow-600', ALTA: 'text-orange-600', CRITICA: 'text-red-600',
};

export default function TicketsPage() {
  const [orgId, setOrgId] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: '', category: '', priority: 'MEDIA', channel: 'CHAT', firstMessage: '' });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => { const s = localStorage.getItem('selectedOrgId'); if (s) setOrgId(s); }, []);

  async function fetchTickets() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ organizationId: orgId });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/crm/tickets?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTickets(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchTickets(); }, [orgId, statusFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/crm/tickets?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { setCreating(false); fetchTickets(); }
  }

  async function sendReply() {
    if (!selectedTicket || !replyText) return;
    const token = localStorage.getItem('token');
    await fetch(`${API}/crm/tickets/${selectedTicket.id}/mensagens?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: replyText }),
    });
    setReplyText('');
    fetchTickets();
  }

  async function updateStatus(id: string, status: string) {
    const token = localStorage.getItem('token');
    await fetch(`${API}/crm/tickets/${id}/status?organizationId=${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchTickets();
  }

  const slaPast = (t: Ticket) => t.slaDeadline && new Date(t.slaDeadline) < new Date() && !['RESOLVIDO', 'FECHADO'].includes(t.status);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">Atendimento e suporte via CRM — separado do prontuário</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTickets} className="p-2 border rounded-lg hover:bg-gray-50" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Novo Ticket
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE', 'RESOLVIDO', 'FECHADO'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs rounded-full border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {s || 'Todos'}
          </button>
        ))}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Novo Ticket</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Assunto *</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            {[
              { label: 'Categoria', key: 'category' },
              { label: 'Canal (CHAT, EMAIL, TELEFONE)', key: 'channel' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Prioridade</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Primeira mensagem</label>
              <textarea rows={3} value={form.firstMessage} onChange={(e) => setForm({ ...form, firstMessage: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Criar</button>
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 border text-sm rounded-lg">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Assunto', 'Canal', 'Prioridade', 'SLA', 'Status', 'Msgs', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {tickets.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum ticket</td></tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className={`hover:bg-gray-50 ${slaPast(t) ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3">
                  <button onClick={() => setSelectedTicket(selectedTicket?.id === t.id ? null : t)} className="font-medium text-left hover:underline">
                    {t.subject}
                  </button>
                  {t.category && <p className="text-xs text-gray-500">{t.category}</p>}
                </td>
                <td className="px-4 py-3 text-gray-500">{t.channel ?? '—'}</td>
                <td className={`px-4 py-3 font-medium ${PRIORITY_COLOR[t.priority] ?? ''}`}>{t.priority}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {t.slaDeadline ? (
                    <span className={slaPast(t) ? 'text-red-600 font-medium' : ''}>
                      {new Date(t.slaDeadline).toLocaleString('pt-BR')}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{t.messages.length}</td>
                <td className="px-4 py-3">
                  {!['RESOLVIDO', 'FECHADO'].includes(t.status) && (
                    <button onClick={() => updateStatus(t.id, 'RESOLVIDO')} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                      Resolver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTicket && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <h2 className="font-semibold">Mensagens — {selectedTicket.subject}</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedTicket.messages.map((m) => (
              <div key={m.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-xs text-gray-500 mb-1">{m.authorName}</p>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
          {!['RESOLVIDO', 'FECHADO'].includes(selectedTicket.status) && (
            <div className="flex gap-2">
              <input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escreva uma resposta..." className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={sendReply} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Enviar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
