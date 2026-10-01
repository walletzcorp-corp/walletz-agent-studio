'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Calendar } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface AvailabilityRule {
  id: string;
  unitId: string;
  professionalId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMin: number;
  active: boolean;
  validFrom?: string;
  validUntil?: string;
}

export default function AvailabilityRulesPage() {
  const token = useToken();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [orgs, setOrgs] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);

  const [form, setForm] = useState({
    orgId: '',
    unitId: '',
    professionalId: '',
    dayOfWeek: '1',
    startTime: '08:00',
    endTime: '17:00',
    slotMin: '30',
    validFrom: '',
    validUntil: '',
  });

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => setOrgs(r.data ?? r.items ?? []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !form.orgId) return;
    Promise.all([
      api.get<any>(`/units?organizationId=${form.orgId}&limit=100`, token),
      api.get<any>(`/professionals?organizationId=${form.orgId}&limit=100`, token),
    ]).then(([u, p]) => {
      setUnits(u.data ?? u.items ?? []);
      setProfessionals(p.data ?? p.items ?? []);
    }).catch(() => {});
  }, [token, form.orgId]);

  async function loadRules() {
    if (!token || !form.unitId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ unitId: form.unitId });
      if (form.professionalId) qs.set('professionalId', form.professionalId);
      const data = await api.get<AvailabilityRule[]>(`/scheduling/availability/rules?${qs}`, token);
      setRules(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRules(); }, [form.unitId, form.professionalId, token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/scheduling/availability/rules', {
        unitId: form.unitId,
        professionalId: form.professionalId || undefined,
        dayOfWeek: +form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        slotMin: +form.slotMin,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
      }, token);
      setSuccess('Regra criada com sucesso!');
      setShowForm(false);
      await loadRules();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(id: string) {
    if (!token) return;
    try {
      await api.delete(`/scheduling/availability/rules/${id}`, token);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/schedule" className="text-slate-400 hover:text-slate-700"><ArrowLeft size={20} /></Link>
        <h1>Regras de Disponibilidade</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 mb-4 text-sm">{success}</div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Organização</label>
            <select className="input" value={form.orgId}
              onChange={(e) => setForm({ ...form, orgId: e.target.value, unitId: '', professionalId: '' })}>
              <option value="">Selecione…</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unidade</label>
            <select className="input" value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value, professionalId: '' })}>
              <option value="">Selecione…</option>
              {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Profissional (opcional)</label>
            <select className="input" value={form.professionalId}
              onChange={(e) => setForm({ ...form, professionalId: e.target.value })}>
              <option value="">Todos</option>
              {professionals.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Rule list */}
      {form.unitId && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Regras cadastradas</h2>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={14} /> Nova regra
            </button>
          </div>

          {loading ? (
            <div className="text-slate-400 py-8 text-center">Carregando…</div>
          ) : rules.length === 0 ? (
            <div className="card py-8 text-center text-slate-400">
              <Calendar size={28} className="mx-auto mb-2 opacity-40" />
              Nenhuma regra de disponibilidade cadastrada.
            </div>
          ) : (
            <div className="card p-0 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-surface-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Dia</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Horário</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Slot (min)</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Vigência</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{DAYS[r.dayOfWeek]}</td>
                      <td className="px-4 py-3">{r.startTime} – {r.endTime}</td>
                      <td className="px-4 py-3">{r.slotMin} min</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.validFrom ? new Date(r.validFrom).toLocaleDateString('pt-BR') : '—'} a{' '}
                        {r.validUntil ? new Date(r.validUntil).toLocaleDateString('pt-BR') : 'sem fim'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-red-400 hover:text-red-600" onClick={() => deleteRule(r.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* New rule form */}
      {showForm && form.unitId && (
        <div className="card border-brand-emerald border-2">
          <h3 className="text-sm font-semibold mb-4">Nova regra de disponibilidade</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Dia da semana *</label>
                <select className="input" required value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Slot (minutos) *</label>
                <input type="number" className="input" min="5" max="120" required
                  value={form.slotMin}
                  onChange={(e) => setForm({ ...form, slotMin: e.target.value })} />
              </div>
              <div>
                <label className="label">Hora início *</label>
                <input type="time" className="input" required
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <label className="label">Hora fim *</label>
                <input type="time" className="input" required
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
              <div>
                <label className="label">Válido a partir de</label>
                <input type="date" className="input"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
              </div>
              <div>
                <label className="label">Válido até</label>
                <input type="date" className="input"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Salvando…' : 'Criar regra'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
