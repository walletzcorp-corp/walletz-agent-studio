'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, Plus, RefreshCw, Link2, Link2Off, 
  CheckCircle2, AlertCircle, Clock, Zap, Video,
  ExternalLink, Users, CalendarDays,
  MoreHorizontal, Edit2, Trash2, PhoneCall,
} from 'lucide-react';
import { useAuth } from '../../../hooks/use-auth';

/* ── Types ── */
interface CalendarConnection {
  id: string;
  provider: 'google' | 'microsoft';
  email: string;
  displayName: string;
  syncStatus: 'synced' | 'pending' | 'error' | 'disconnected' | 'reauth_required';
  lastSyncAt: string | null;
}

interface UpcomingMeeting {
  id: string;
  title: string;
  contact: string;
  responsible: string;
  date: string;
  time: string;
  duration: number;
  platform: 'google_meet' | 'teams' | 'presencial' | 'phone';
  status: 'confirmed' | 'pending' | 'cancelled';
  origin: 'agent' | 'manual';
  agentName?: string;
  meetUrl?: string;
}

/* ── Provider metadata ── */
const PROVIDERS = {
  google: {
    name: 'Google Calendar',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.34 5 12c0-4.19 3.22-7.19 7.19-7.19 2.86 0 4.94 1.46 5.94 2.85l1.93-1.88C18.45 4.11 15.58 2.5 12.19 2.5 5.95 2.5 1 7.58 1 12s4.95 9.5 11.19 9.5c6.12 0 10.41-4.44 10.41-10.29 0-.7-.07-1.29-.25-1.91z" fill="#4285F4"/>
        <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.34 5 12c0-4.19 3.22-7.19 7.19-7.19 2.86 0 4.94 1.46 5.94 2.85l1.93-1.88C18.45 4.11 15.58 2.5 12.19 2.5 5.95 2.5 1 7.58 1 12s4.95 9.5 11.19 9.5c6.12 0 10.41-4.44 10.41-10.29 0-.7-.07-1.29-.25-1.91z" fill="#4285F4" className="hidden"/>
      </svg>
    ),
    color: '#4285F4',
    bgClass: 'bg-[#4285F4]/10',
    textClass: 'text-[#4285F4]',
    borderClass: 'border-[#4285F4]/30',
  },
  microsoft: {
    name: 'Microsoft Teams',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M13.5 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill="#5059C9"/>
        <path d="M18.75 8.5h-7.5A.75.75 0 0 0 10.5 9.25v6.5a4.25 4.25 0 0 0 8.5 0v-6.5a.75.75 0 0 0-.25-.75z" fill="#5059C9"/>
        <path d="M8 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="#7B83EB"/>
        <path d="M10 12.5H5.5a.5.5 0 0 0-.5.5v4a3 3 0 0 0 6 0v-4a.5.5 0 0 0-.5-.5z" fill="#7B83EB"/>
      </svg>
    ),
    color: '#5059C9',
    bgClass: 'bg-[#5059C9]/10',
    textClass: 'text-[#5059C9]',
    borderClass: 'border-[#5059C9]/30',
  },
};

const SYNC_STATUS_CONFIG = {
  synced:           { label: 'Sincronizado', className: 'badge-success' },
  pending:          { label: 'Sincronizando…', className: 'badge-warning' },
  error:            { label: 'Erro', className: 'badge-danger' },
  disconnected:     { label: 'Desconectado', className: 'bg-muted text-muted-foreground border border-border' },
  reauth_required:  { label: 'Reautorizar', className: 'badge-danger' },
};

const PLATFORM_CONFIG = {
  google_meet: { label: 'Google Meet', color: 'text-[#4285F4]', icon: Video },
  teams:        { label: 'Teams',       color: 'text-[#5059C9]', icon: Video },
  presencial:   { label: 'Presencial',  color: 'text-neural-success', icon: Users },
  phone:        { label: 'Telefone',    color: 'text-neural-warning', icon: PhoneCall },
};

/* ── Sample upcoming meetings (shown when no real data) ── */
const SAMPLE_MEETINGS: UpcomingMeeting[] = [
  {
    id: '1', title: 'Demo — Proposta Comercial',
    contact: 'Carlos Lima', responsible: 'você',
    date: 'Hoje', time: '14:00', duration: 30,
    platform: 'google_meet', status: 'confirmed', origin: 'agent', agentName: 'Agente Demo',
    meetUrl: '#',
  },
  {
    id: '2', title: 'Reunião de Follow-up',
    contact: 'Ana Souza', responsible: 'você',
    date: 'Amanhã', time: '10:30', duration: 45,
    platform: 'teams', status: 'confirmed', origin: 'manual',
  },
  {
    id: '3', title: 'Apresentação Inicial',
    contact: 'Pedro Alves', responsible: 'você',
    date: 'Sex, 10 Out', time: '09:00', duration: 60,
    platform: 'google_meet', status: 'pending', origin: 'agent', agentName: 'Agente Demo',
  },
];

/* ── Days of week helper ── */
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDays() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return {
      label: DAYS_PT[i],
      day: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

/* ── Page ── */
function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

export default function AgendasPage() {
  const { tenantId } = useAuth();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'meetings' | 'settings'>('overview');

  const weekDays = getWeekDays();

  useEffect(() => {
    if (!tenantId) return;
    const token = getToken();
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/v1/tenants/${tenantId}/calendars/connections`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setConnections(Array.isArray(data) ? data : []))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleConnect = (provider: 'google' | 'microsoft') => {
    if (!tenantId) return;
    window.location.href = `/api/v1/tenants/${tenantId}/calendars/${provider}/authorize`;
  };

  const handleSync = async () => {
    if (!tenantId || syncing) return;
    const token = getToken();
    if (!token) return;
    setSyncing(true);
    try {
      await fetch(`/api/v1/tenants/${tenantId}/calendars/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!tenantId) return;
    const token = getToken();
    if (!token) return;
    await fetch(`/api/v1/tenants/${tenantId}/calendars/connections/${connectionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  const hasConnections = connections.length > 0;
  const connectedCount = connections.filter(c => c.syncStatus === 'synced').length;

  return (
    <div className="page-container space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Agendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie calendários conectados, disponibilidade e reuniões dos seus agentes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSync}
            disabled={syncing || !hasConnections}
            className="btn-ghost flex items-center gap-2 rounded-lg px-3 py-2 text-sm disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <button
            onClick={() => handleConnect('google')}
            className="flex items-center gap-2 rounded-lg bg-[#4285F4]/10 border border-[#4285F4]/30 text-[#4285F4] px-3 py-2 text-sm font-medium hover:bg-[#4285F4]/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Google
          </button>
          <button
            onClick={() => handleConnect('microsoft')}
            className="flex items-center gap-2 rounded-lg bg-[#5059C9]/10 border border-[#5059C9]/30 text-[#5059C9] px-3 py-2 text-sm font-medium hover:bg-[#5059C9]/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Teams
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: 'Agendas conectadas',
            value: loading ? '—' : connectedCount.toString(),
            icon: Link2,
            color: 'text-neural-violet',
            bg: 'bg-neural-violet/10',
          },
          {
            label: 'Eventos hoje',
            value: '3',
            icon: CalendarDays,
            color: 'text-neural-blue',
            bg: 'bg-neural-blue/10',
          },
          {
            label: 'Reuniões esta semana',
            value: '8',
            icon: Video,
            color: 'text-neural-cyan',
            bg: 'bg-neural-cyan/10',
          },
          {
            label: 'Conflitos detectados',
            value: '0',
            icon: AlertCircle,
            color: 'text-neural-success',
            bg: 'bg-neural-success/10',
          },
          {
            label: 'Sync pendente',
            value: connections.filter(c => c.syncStatus === 'pending').length.toString(),
            icon: Clock,
            color: 'text-neural-warning',
            bg: 'bg-neural-warning/10',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-md ${stat.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </span>
              </div>
              <p className="text-2xl font-display font-semibold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'overview', label: 'Calendários' },
          { id: 'calendar', label: 'Calendário' },
          { id: 'meetings', label: 'Próximas reuniões' },
          { id: 'settings', label: 'Disponibilidade' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Calendários ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="neural-card p-5 animate-pulse">
                  <div className="h-4 w-32 bg-surface-2 rounded mb-3" />
                  <div className="h-3 w-48 bg-surface-2 rounded" />
                </div>
              ))}
            </div>
          ) : !hasConnections ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neural-violet/10 mb-4">
                <Calendar className="h-8 w-8 text-neural-violet" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                Nenhuma agenda conectada
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Conecte seu Google Calendar ou Microsoft 365 para que seus agentes possam
                verificar disponibilidade e criar reuniões automaticamente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleConnect('google')}
                  className="flex items-center gap-2.5 rounded-lg bg-[#4285F4]/10 border border-[#4285F4]/40 text-[#4285F4] px-5 py-2.5 text-sm font-medium hover:bg-[#4285F4]/20 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Conectar Google Calendar
                </button>
                <button
                  onClick={() => handleConnect('microsoft')}
                  className="flex items-center gap-2.5 rounded-lg bg-[#5059C9]/10 border border-[#5059C9]/40 text-[#5059C9] px-5 py-2.5 text-sm font-medium hover:bg-[#5059C9]/20 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24z" fill="#F1511B"/>
                    <path d="M24 24H12.6V12.6H24V24z" fill="#80CC28"/>
                    <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#00ADEF"/>
                    <path d="M24 11.4H12.6V0H24v11.4z" fill="#FBBC09"/>
                  </svg>
                  Conectar Microsoft / Teams
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((conn) => {
                const prov = PROVIDERS[conn.provider];
                const status = SYNC_STATUS_CONFIG[conn.syncStatus];
                return (
                  <div key={conn.id} className="neural-card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${prov.bgClass} border ${prov.borderClass}`}>
                          <span className={prov.textClass}>{prov.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{prov.name}</p>
                          <p className="text-xs text-muted-foreground">{conn.email}</p>
                        </div>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground p-1 rounded">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {status.label}
                      </span>
                      {conn.lastSyncAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(conn.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 btn-ghost rounded-md py-1.5 text-xs">
                        Gerenciar
                      </button>
                      <button
                        onClick={() => handleDisconnect(conn.id)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-neural-danger hover:bg-neural-danger/10 border border-neural-danger/20 transition-colors"
                      >
                        <Link2Off className="h-3 w-3" />
                        Desconectar
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add more */}
              <button
                onClick={() => handleConnect('google')}
                className="neural-card p-5 flex flex-col items-center justify-center gap-3 text-center hover:border-primary/40 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Conectar outra agenda
                </p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Calendário Visual ── */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Week navigator */}
          <div className="neural-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Semana atual</h3>
              <div className="flex items-center gap-2">
                <button className="btn-ghost rounded-md px-2 py-1 text-xs">‹ Anterior</button>
                <span className="text-xs text-muted-foreground">Out 2026</span>
                <button className="btn-ghost rounded-md px-2 py-1 text-xs">Próxima ›</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d) => (
                <div
                  key={d.label}
                  className={`rounded-lg p-2 text-center cursor-pointer transition-colors ${
                    d.isToday
                      ? 'bg-primary/15 border border-primary/30'
                      : 'hover:bg-surface-2'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                  <p className={`text-sm font-semibold ${d.isToday ? 'text-primary' : 'text-foreground'}`}>
                    {d.day}
                  </p>
                  {/* Fake event dots */}
                  {d.isToday && (
                    <div className="flex justify-center gap-0.5 mt-1.5">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      <span className="h-1 w-1 rounded-full bg-neural-blue" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="neural-card divide-y divide-border/50">
            {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
              <div key={time} className="flex items-center gap-4 px-4 py-2.5 hover:bg-surface-2/50 transition-colors">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">{time}</span>
                <div className="flex-1 h-8 flex items-center">
                  {time === '14:00' && !loading && (
                    <div className="rounded-md bg-primary/15 border border-primary/30 px-3 py-1 text-xs text-primary font-medium flex items-center gap-2">
                      <Video className="h-3 w-3" />
                      Demo — Proposta Comercial · Google Meet
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!hasConnections && (
            <div className="neural-card p-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Conecte uma agenda para visualizar eventos reais
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Próximas reuniões ── */}
      {activeTab === 'meetings' && (
        <div className="neural-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Próximas reuniões</h3>
            <button className="btn-primary rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nova reunião
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reunião</th>
                <th>Cliente</th>
                <th>Data / Hora</th>
                <th>Plataforma</th>
                <th>Status</th>
                <th>Origem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_MEETINGS.map((m) => {
                const plat = PLATFORM_CONFIG[m.platform];
                const PlatIcon = plat.icon;
                return (
                  <tr key={m.id}>
                    <td>
                      <p className="font-medium text-foreground text-sm">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.duration} min · {m.responsible}</p>
                    </td>
                    <td className="text-sm">{m.contact}</td>
                    <td className="text-sm">
                      <p className="text-foreground">{m.date}</p>
                      <p className="text-muted-foreground text-xs">{m.time}</p>
                    </td>
                    <td>
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${plat.color}`}>
                        <PlatIcon className="h-3.5 w-3.5" />
                        {plat.label}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === 'confirmed' ? 'badge-success' :
                        m.status === 'pending' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {m.status === 'confirmed' ? 'Confirmado' :
                         m.status === 'pending' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </td>
                    <td>
                      {m.origin === 'agent' ? (
                        <span className="badge-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                          <Zap className="h-2.5 w-2.5" />
                          {m.agentName ?? 'Agente'}
                        </span>
                      ) : (
                        <span className="badge-blue inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
                          Manual
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {m.meetUrl && (
                          <a href={m.meetUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded text-muted-foreground hover:text-neural-blue transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button className="p-1.5 rounded text-muted-foreground hover:text-neural-danger">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Disponibilidade ── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="neural-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Horário comercial</h3>
              <p className="text-xs text-muted-foreground">Defina quando você está disponível para reuniões</p>
            </div>
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-8 text-xs font-medium text-muted-foreground">{day}</span>
                <select className="flex-1 rounded-md bg-surface-2 border border-border px-2 py-1.5 text-sm text-foreground">
                  <option>09:00</option>
                  <option>08:00</option>
                  <option>07:00</option>
                </select>
                <span className="text-xs text-muted-foreground">até</span>
                <select className="flex-1 rounded-md bg-surface-2 border border-border px-2 py-1.5 text-sm text-foreground">
                  <option>18:00</option>
                  <option>17:00</option>
                  <option>19:00</option>
                </select>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="w-8 text-xs font-medium text-muted-foreground/40">Sáb</span>
              <span className="text-xs text-muted-foreground italic">Indisponível</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="neural-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Configurações de reunião</h3>
              {[
                { label: 'Duração padrão', value: '30 min' },
                { label: 'Buffer entre reuniões', value: '15 min' },
                { label: 'Limite diário', value: '8 reuniões' },
                { label: 'Antecedência mínima', value: '2 horas' },
                { label: 'Plataforma padrão', value: 'Google Meet' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="neural-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Agente pode agendar?</h3>
                  <p className="text-xs text-muted-foreground">Permitir que o Agente Demo marque reuniões automaticamente</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
                  <span className="translate-x-6 h-4 w-4 rounded-full bg-white shadow transition-transform inline-block" />
                </button>
              </div>
            </div>

            <button className="w-full btn-primary rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Salvar configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
