'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, CheckCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011/api/v1';

interface Template {
  id: string; name: string; channel: string; purpose: string;
  subject?: string; body: string; approved: boolean; active: boolean;
  approvedBy?: string; createdAt: string;
}

export default function TemplatesPage() {
  const [orgId, setOrgId] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', channel: 'EMAIL', purpose: 'COMERCIAL', subject: '', body: '' });
  const [error, setError] = useState('');

  useEffect(() => { const s = localStorage.getItem('selectedOrgId'); if (s) setOrgId(s); }, []);

  async function fetchTemplates() {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/crm/templates?organizationId=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTemplates(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchTemplates(); }, [orgId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/crm/templates?organizationId=${orgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { setCreating(false); setForm({ name: '', channel: 'EMAIL', purpose: 'COMERCIAL', subject: '', body: '' }); fetchTemplates(); }
    else { const e2 = await res.json(); setError(e2.message ?? 'Erro ao criar template'); }
  }

  async function approve(id: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/crm/templates/${id}/aprovar?organizationId=${orgId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchTemplates();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de Comunicação</h1>
          <p className="text-sm text-gray-500 mt-1">Templates para e-mail, WhatsApp e SMS — apenas uso comercial</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTemplates} className="p-2 border rounded-lg hover:bg-gray-50" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Novo Template
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>Importante:</strong> Templates de comunicação comercial não devem incluir dados clínicos ou de prontuário.
        Todo envio depende de consentimento registrado no perfil do lead ou paciente.
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Novo Template</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Nome *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Canal</label>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['EMAIL', 'WHATSAPP', 'SMS', 'PUSH'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Finalidade</label>
              <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['COMERCIAL', 'ONBOARDING', 'REATIVACAO', 'PESQUISA'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Assunto (e-mail)</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Corpo do template *</label>
              <textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Use {{nome}}, {{clinica}} como variáveis..."
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono" required />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Salvar</button>
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 border text-sm rounded-lg">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 && !creating && (
          <div className="col-span-3 text-center py-12 text-gray-400">Nenhum template cadastrado</div>
        )}
        {templates.map((t) => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{t.name}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{t.channel}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{t.purpose}</span>
                </div>
              </div>
              {t.approved && <CheckCircle size={18} className="text-green-500 flex-shrink-0" />}
            </div>
            {t.subject && <p className="text-xs text-gray-500 font-medium">Assunto: {t.subject}</p>}
            <p className="text-xs text-gray-600 line-clamp-3 font-mono bg-gray-50 p-2 rounded">{t.body}</p>
            <div className="flex gap-2">
              <button onClick={() => setPreview(preview?.id === t.id ? null : t)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                {preview?.id === t.id ? 'Fechar' : 'Ver'}
              </button>
              {!t.approved && (
                <button onClick={() => approve(t.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                  Aprovar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold mb-3">Preview: {preview.name}</h2>
          <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded border">{preview.body}</pre>
        </div>
      )}
    </div>
  );
}
