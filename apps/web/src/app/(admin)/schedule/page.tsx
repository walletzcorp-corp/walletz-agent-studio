'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock } from 'lucide-react';
import { useToken } from '@/hooks/useToken';
import { api } from '@/lib/api';

type ViewMode = 'day' | 'week' | 'month';

const STATUS_COLOR: Record<string, string> = {
  AGENDADO: 'bg-blue-100 border-blue-300 text-blue-800',
  CONFIRMADO: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  AGUARDANDO: 'bg-amber-100 border-amber-300 text-amber-800',
  EM_ATENDIMENTO: 'bg-purple-100 border-purple-300 text-purple-800',
  FINALIZADO: 'bg-slate-100 border-slate-300 text-slate-600',
  CANCELADO: 'bg-red-50 border-red-200 text-red-500 line-through opacity-60',
  NAO_COMPARECEU: 'bg-orange-50 border-orange-200 text-orange-600 opacity-60',
  REAGENDADO: 'bg-slate-50 border-slate-200 text-slate-400 opacity-50',
};

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', AGUARDANDO: 'Aguardando',
  EM_ATENDIMENTO: 'Em atendimento', FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado', NAO_COMPARECEU: 'Não compareceu', REAGENDADO: 'Reagendado',
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00–19:00

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default function SchedulePage() {
  const token = useToken();
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState<{ id: string; name: string }[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState('');
  const [orgs, setOrgs] = useState<{ id: string; nomeFantasia: string }[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get<any>('/organizations?limit=100&status=ATIVA', token)
      .then((r) => {
        const list = r.data ?? r.items ?? [];
        setOrgs(list);
        if (list.length === 1) setSelectedOrg(list[0].id);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !selectedOrg) return;
    api.get<any>(`/professionals?organizationId=${selectedOrg}&limit=100`, token)
      .then((r) => setProfessionals(r.data ?? r.items ?? []))
      .catch(() => {});
  }, [token, selectedOrg]);

  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      let dateFrom: string, dateTo: string;
      if (view === 'day') {
        dateFrom = isoDate(anchor);
        dateTo = isoDate(anchor);
      } else if (view === 'week') {
        const ws = startOfWeek(anchor);
        dateFrom = isoDate(ws);
        dateTo = isoDate(addDays(ws, 6));
      } else {
        const ms = startOfMonth(anchor);
        dateFrom = isoDate(ms);
        dateTo = isoDate(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
      }

      const qs = new URLSearchParams({ dateFrom, dateTo, limit: '200' });
      if (selectedOrg) qs.set('organizationId', selectedOrg);
      if (selectedProfessional) qs.set('professionalId', selectedProfessional);

      const result = await api.get<any>(`/appointments?${qs}`, token);
      setAppointments(result.data ?? []);
    } catch {}
    setLoading(false);
  }, [token, view, anchor, selectedOrg, selectedProfessional]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  function navigate(dir: -1 | 1) {
    setAnchor((prev) => {
      if (view === 'day') return addDays(prev, dir);
      if (view === 'week') return addDays(prev, dir * 7);
      return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
    });
  }

  function headerLabel() {
    if (view === 'day') return anchor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const ws = startOfWeek(anchor);
      const we = addDays(ws, 6);
      return `${ws.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${we.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    return anchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function apptsByDay(dateStr: string) {
    return appointments.filter((a) => a.startsAt.startsWith(dateStr));
  }

  // ---- Day View ----
  function DayView() {
    const dateStr = isoDate(anchor);
    const dayAppts = apptsByDay(dateStr);

    return (
      <div className="border border-surface-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[60px_1fr] divide-x divide-surface-border">
          <div />
          <div className="bg-slate-50 px-4 py-2 font-medium text-sm text-slate-700">
            {anchor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>
        {HOURS.map((h) => {
          const slotAppts = dayAppts.filter((a) => new Date(a.startsAt).getHours() === h);
          return (
            <div key={h} className="grid grid-cols-[60px_1fr] divide-x divide-surface-border border-t border-surface-border min-h-[48px]">
              <div className="px-2 py-1 text-xs text-slate-400 text-right">{String(h).padStart(2, '0')}:00</div>
              <div className="px-2 py-1 space-y-1">
                {slotAppts.map((a) => (
                  <Link key={a.id} href={`/appointments/${a.id}`}
                    className={`block text-xs px-2 py-1 rounded border ${STATUS_COLOR[a.status]}`}>
                    <span className="font-medium">{new Date(a.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {' '}{a.patient?.name ?? '—'} · {a.service?.name ?? a.type}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ---- Week View ----
  function WeekView() {
    const weekStart = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="border border-surface-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-surface-border">
          <div className="bg-slate-50" />
          {days.map((d) => (
            <div key={d.toISOString()} className="bg-slate-50 px-2 py-2 text-center">
              <div className="text-xs text-slate-500">{WEEK_DAYS[d.getDay()]}</div>
              <div className={`text-sm font-medium ${isoDate(d) === isoDate(new Date()) ? 'text-brand-emerald' : 'text-slate-700'}`}>
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>
        {HOURS.map((h) => (
          <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-surface-border border-t border-surface-border min-h-[44px]">
            <div className="px-2 py-1 text-xs text-slate-400 text-right">{String(h).padStart(2, '0')}:00</div>
            {days.map((d) => {
              const dateStr = isoDate(d);
              const slotAppts = apptsByDay(dateStr).filter((a) => new Date(a.startsAt).getHours() === h);
              return (
                <div key={dateStr} className="px-1 py-1 space-y-0.5">
                  {slotAppts.map((a) => (
                    <Link key={a.id} href={`/appointments/${a.id}`}
                      className={`block text-xs px-1 py-0.5 rounded border ${STATUS_COLOR[a.status]} truncate`}
                      title={`${a.patient?.name} — ${a.service?.name ?? a.type}`}>
                      {new Date(a.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {a.patient?.name ?? '—'}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ---- Month View ----
  function MonthView() {
    const ms = startOfMonth(anchor);
    const startDay = ms.getDay();
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array(startDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div className="border border-surface-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-surface-border bg-slate-50">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center py-2 text-xs font-medium text-slate-600">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="border-t border-l border-surface-border min-h-[100px] bg-slate-50/50" />;
            const dateStr = isoDate(d);
            const dayAppts = apptsByDay(dateStr);
            const isToday = dateStr === isoDate(new Date());
            return (
              <div key={dateStr} className={`border-t border-l border-surface-border min-h-[100px] p-1 ${isToday ? 'bg-emerald-50/40' : ''}`}>
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-emerald text-white' : 'text-slate-600'}`}>
                  {d.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 3).map((a) => (
                    <Link key={a.id} href={`/appointments/${a.id}`}
                      className={`block text-xs px-1 rounded border truncate ${STATUS_COLOR[a.status]}`}>
                      {new Date(a.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {a.patient?.name ?? '—'}
                    </Link>
                  ))}
                  {dayAppts.length > 3 && (
                    <span className="text-xs text-slate-400">+{dayAppts.length - 3} mais</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1>Agenda</h1>
        <div className="flex gap-2">
          <Link href="/schedule/wait-list" className="btn-secondary text-sm">
            <Clock size={14} /> Lista de Espera
          </Link>
          <Link href="/schedule/availability-rules" className="btn-secondary text-sm">
            <Calendar size={14} /> Disponibilidade
          </Link>
          <Link href="/appointments/new" className="btn-primary">
            <Plus size={16} /> Novo Agendamento
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {orgs.length > 1 && (
          <select className="input py-1.5 text-sm w-52"
            value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)}>
            <option value="">Todas as organizações</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nomeFantasia}</option>)}
          </select>
        )}
        <select className="input py-1.5 text-sm w-52"
          value={selectedProfessional} onChange={(e) => setSelectedProfessional(e.target.value)}>
          <option value="">Todos os profissionais</option>
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex border border-surface-border rounded-lg overflow-hidden text-sm">
          {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 ${view === v ? 'bg-brand-emerald text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {{ day: 'Dia', week: 'Semana', month: 'Mês' }[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-slate-100">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-slate-700 min-w-[220px] text-center capitalize">{headerLabel()}</span>
        <button onClick={() => navigate(1)} className="p-1.5 rounded hover:bg-slate-100">
          <ChevronRight size={18} />
        </button>
        <button onClick={() => setAnchor(new Date())} className="ml-2 text-xs text-brand-emerald hover:underline">Hoje</button>
        {loading && <span className="text-xs text-slate-400 ml-2">Carregando…</span>}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[k]}`}>{v}</span>
        ))}
      </div>

      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}
    </div>
  );
}
