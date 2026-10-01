'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';

const APPT_TYPES = [
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'RETORNO', label: 'Retorno' },
  { value: 'SESSAO', label: 'Sessão' },
  { value: 'PROCEDIMENTO', label: 'Procedimento' },
  { value: 'TELECONSULTA', label: 'Teleconsulta' },
];

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<{ startsAt: string; endsAt: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [orgs, setOrgs] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  const [form, setForm] = useState({
    organizationId: '',
    unitId: '',
    professionalId: '',
    serviceId: '',
    resourceId: '',
    patientId: searchParams.get('patientId') ?? '',
    type: 'CONSULTA',
    date: '',
    slotIndex: '',
    notes: '',
    isOnlineBooking: false,
    // RF-AGE-004: recorrência
    recurrenceEnabled: false,
    recurrenceType: 'SEMANAL',
    totalSessions: '4',
  });

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => setOrgs(r.data ?? r.items ?? []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !form.organizationId) return;
    Promise.all([
      api.get<any>(`/units?organizationId=${form.organizationId}&limit=100`, token),
      api.get<any>(`/professionals?organizationId=${form.organizationId}&limit=100`, token),
      api.get<any>(`/services?organizationId=${form.organizationId}&limit=100`, token),
      api.get<any>(`/patients?organizationId=${form.organizationId}&limit=100`, token),
    ]).then(([u, p, s, pat]) => {
      setUnits(u.data ?? u.items ?? []);
      setProfessionals(p.data ?? p.items ?? []);
      setServices(s.data ?? s.items ?? []);
      setPatients(pat.data ?? []);
    }).catch(() => {});
  }, [token, form.organizationId]);

  useEffect(() => {
    if (!token || !form.unitId || !form.date) return;
    const svc = services.find((s) => s.id === form.serviceId);
    const durationMin = svc?.durationMin ?? 30;
    setLoadingSlots(true);
    const qs = new URLSearchParams({ unitId: form.unitId, date: form.date, durationMin: String(durationMin) });
    if (form.professionalId) qs.set('professionalId', form.professionalId);
    api.get<any[]>(`/scheduling/availability?${qs}`, token)
      .then((r) => setSlots(Array.isArray(r) ? r : []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [token, form.unitId, form.date, form.professionalId, form.serviceId, services]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.slotIndex && form.slotIndex !== '0') {
      setError('Selecione um horário disponível');
      return;
    }
    const slot = slots[+form.slotIndex];
    if (!slot) { setError('Horário inválido'); return; }

    setLoading(true);
    try {
      await api.post('/appointments', {
        organizationId: form.organizationId,
        unitId: form.unitId,
        professionalId: form.professionalId || undefined,
        serviceId: form.serviceId || undefined,
        resourceId: form.resourceId || undefined,
        patientId: form.patientId,
        type: form.type,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        notes: form.notes || undefined,
        isOnlineBooking: form.isOnlineBooking,
        recurrence: form.recurrenceEnabled ? {
          type: form.recurrenceType,
          totalSessions: +form.totalSessions,
        } : undefined,
      }, token!);
      router.push('/schedule');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6">Novo Agendamento</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Organização *</label>
          <select className="input" required value={form.organizationId}
            onChange={(e) => setForm({ ...form, organizationId: e.target.value, unitId: '', professionalId: '', serviceId: '' })}>
            <option value="">Selecione…</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Unidade *</label>
          <select className="input" required value={form.unitId}
            onChange={(e) => setForm({ ...form, unitId: e.target.value, slotIndex: '' })}>
            <option value="">Selecione…</option>
            {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Profissional</label>
            <select className="input" value={form.professionalId}
              onChange={(e) => setForm({ ...form, professionalId: e.target.value, slotIndex: '' })}>
              <option value="">Qualquer</option>
              {professionals.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Serviço</label>
            <select className="input" value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value, slotIndex: '' })}>
              <option value="">Selecione…</option>
              {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.durationMin}min)</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Paciente *</label>
            <select className="input" required value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Selecione…</option>
              {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {APPT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Data *</label>
          <input type="date" className="input" required value={form.date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setForm({ ...form, date: e.target.value, slotIndex: '' })} />
        </div>

        {form.unitId && form.date && (
          <div>
            <label className="label">Horário disponível *</label>
            {loadingSlots ? (
              <p className="text-sm text-slate-400">Buscando horários…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-amber-600">Nenhum horário disponível para esta data e configuração.</p>
            ) : (
              <select className="input" required value={form.slotIndex}
                onChange={(e) => setForm({ ...form, slotIndex: e.target.value })}>
                <option value="">Selecione…</option>
                {slots.map((s, i) => (
                  <option key={i} value={i}>
                    {new Date(s.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(s.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="label">Observações</label>
          <textarea className="input min-h-[70px]" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observações para o agendamento…" />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="online" checked={form.isOnlineBooking}
            onChange={(e) => setForm({ ...form, isOnlineBooking: e.target.checked })} />
          <label htmlFor="online" className="text-sm text-slate-700">Agendamento online</label>
        </div>

        {/* RF-AGE-004: Recorrência */}
        <div className="border-t border-surface-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" id="recurrence" checked={form.recurrenceEnabled}
              onChange={(e) => setForm({ ...form, recurrenceEnabled: e.target.checked })} />
            <label htmlFor="recurrence" className="text-sm font-medium text-slate-700">Agendamento recorrente</label>
          </div>
          {form.recurrenceEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-2 border-l-2 border-brand-emerald">
              <div>
                <label className="label">Frequência</label>
                <select className="input" value={form.recurrenceType}
                  onChange={(e) => setForm({ ...form, recurrenceType: e.target.value })}>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINZENAL">Quinzenal</option>
                  <option value="MENSAL">Mensal</option>
                </select>
              </div>
              <div>
                <label className="label">Nº de sessões (incluindo esta)</label>
                <input type="number" className="input" min="2" max="52"
                  value={form.totalSessions}
                  onChange={(e) => setForm({ ...form, totalSessions: e.target.value })} />
              </div>
              <p className="col-span-2 text-xs text-slate-500">
                Serão criados {+form.totalSessions} agendamentos com intervalo {form.recurrenceType.toLowerCase()}.
                Horários com conflito são ignorados automaticamente.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Agendando…' : 'Confirmar Agendamento'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense>
      <NewAppointmentForm />
    </Suspense>
  );
}
