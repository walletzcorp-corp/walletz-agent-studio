'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, Calendar, CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink,
  Link2, Link2Off, Pencil, PhoneCall, Plus, RefreshCw, Users, Video, XCircle, Zap,
} from 'lucide-react';
import { Select } from '@walletz/ui';
import { useAuth } from '../../../hooks/use-auth';
import { agentsApi, type Agent } from '../../../lib/agents-api';
import { readCalendarCallbackResult, startCalendarConnect, type CalendarProvider } from '../../../lib/calendar-connect';
import {
  addDays, apiErrorMessage, brDate, brLongDate, brTime, calendarsApi, fromBrasilia, weekStart,
  type CalendarConnection, type Meeting, type SyncStatus,
} from '../../../lib/calendars-api';
import { AgentScheduleForm } from '../../../components/agent-schedule-form';
import { ConfirmDialog, NewMeetingDialog, RescheduleDialog } from '../../../components/meeting-dialogs';

const PROVIDERS: Record<CalendarProvider, { name: string; button: string; classes: string }> = {
  google: { name: 'Google Agenda', button: 'Conectar Google', classes: 'bg-[#4285F4]/10 border-[#4285F4]/30 text-[#4285F4] hover:bg-[#4285F4]/20' },
  microsoft: { name: 'Microsoft 365', button: 'Conectar Microsoft', classes: 'bg-[#5059C9]/10 border-[#5059C9]/30 text-[#7B83EB] hover:bg-[#5059C9]/20' },
};

const SYNC_STATUS: Record<SyncStatus, { label: string; className: string }> = {
  synced: { label: 'Conectada', className: 'badge-success' },
  pending: { label: 'Ainda não verificada', className: 'badge-warning' },
  error: { label: 'Não respondeu', className: 'badge-danger' },
  disconnected: { label: 'Desconectada', className: 'bg-muted text-muted-foreground border border-border' },
  reauth_required: { label: 'Reautorizar', className: 'badge-danger' },
};

const PLATFORM = {
  google_meet: { label: 'Google Meet', icon: Video },
  teams: { label: 'Teams', icon: Video },
  presencial: { label: 'Presencial', icon: Users },
  phone: { label: 'Telefone', icon: PhoneCall },
};

const MEETING_STATUS = {
  confirmed: { label: 'Confirmada', className: 'badge-success' },
  pending: { label: 'Pendente', className: 'badge-warning' },
  cancelled: { label: 'Cancelada', className: 'badge-danger' },
  rescheduled: { label: 'Reagendada', className: 'badge-danger' },
};

/** Explica o que aconteceu com a autorização no provedor ao desconectar. */
function disconnectMessage(revocation?: string): string {
  switch (revocation) {
    case 'revoked':
      return 'Agenda desconectada. Os tokens foram apagados e o acesso foi revogado no Google.';
    case 'failed':
      return 'Agenda desconectada e tokens apagados, mas o Google não confirmou a revogação. Remova o acesso em myaccount.google.com/permissions.';
    case 'shared_account':
      return 'Agenda desconectada e tokens apagados. O acesso no Google foi mantido porque outra conexão ativa usa a mesma conta.';
    case 'not_supported':
      return 'Agenda desconectada e tokens apagados. Para remover também a permissão na Microsoft, acesse myapps.microsoft.com.';
    default:
      return 'Agenda desconectada.';
  }
}

type Tab = 'connections' | 'week' | 'meetings' | 'agents';
type DialogState =
  | { kind: 'new' }
  | { kind: 'reschedule' | 'cancel'; meeting: Meeting }
  | { kind: 'disconnect'; connection: CalendarConnection }
  | null;

/** Período carregado: o bastante para os números do topo e a lista de próximas. */
const UPCOMING_DAYS = 60;

export default function AgendasPage() {
  const { tenantId, role } = useAuth();
  const canManage = role === 'owner' || role === 'admin';

  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [weekMeetings, setWeekMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState<CalendarProvider | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [tab, setTab] = useState<Tab>('connections');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [agentId, setAgentId] = useState('');
  const [today, setToday] = useState('');
  const [week, setWeek] = useState('');

  // Datas só no navegador: no servidor o "hoje" poderia divergir na hidratação.
  useEffect(() => {
    const now = brDate(new Date());
    setToday(now);
    setWeek(weekStart(now));
  }, []);

  const load = useCallback(async () => {
    if (!tenantId || !today) return;
    try {
      const from = fromBrasilia(weekStart(today), '00:00');
      const [c, m, a] = await Promise.all([
        calendarsApi.connections(tenantId),
        calendarsApi.meetings(tenantId, from, fromBrasilia(addDays(today, UPCOMING_DAYS), '23:59')),
        agentsApi.list(tenantId),
      ]);
      setConnections(c.data);
      setMeetings(m.data);
      setAgents(a.data.filter((x) => x.status !== 'archived'));
      setLoadError(null);
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Não foi possível carregar as agendas.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, today]);

  const loadWeek = useCallback(async () => {
    if (!tenantId || !week) return;
    try {
      const { data } = await calendarsApi.meetings(tenantId, fromBrasilia(week, '00:00'), fromBrasilia(addDays(week, 7), '00:00'));
      setWeekMeetings(data);
    } catch (err) {
      setNotice({ kind: 'error', text: apiErrorMessage(err, 'Não foi possível carregar a semana.') });
    }
  }, [tenantId, week]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadWeek(); }, [loadWeek]);

  // Resultado do retorno do Google/Microsoft (?connected= ou ?error=).
  useEffect(() => {
    const result = readCalendarCallbackResult();
    if (result?.connected) setNotice({ kind: 'ok', text: `${PROVIDERS[result.connected].name}: agenda conectada. Agora escolha qual agente vai usá-la em “Agentes e expediente”.` });
    else if (result?.error) setNotice({ kind: 'error', text: result.error });
  }, []);

  const connect = async (provider: CalendarProvider): Promise<void> => {
    if (!tenantId || connecting) return;
    setNotice(null);
    setConnecting(provider);
    try {
      await startCalendarConnect(tenantId, provider);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Não foi possível conectar.' });
      setConnecting(null);
    }
  };

  const check = async (): Promise<void> => {
    if (!tenantId || checking) return;
    setChecking(true);
    setNotice(null);
    try {
      const { data } = await calendarsApi.check(tenantId);
      setNotice(data.failed === 0
        ? { kind: 'ok', text: data.synced === 1 ? 'A agenda está respondendo.' : `As ${data.synced} agendas estão respondendo.` }
        : { kind: 'error', text: `${data.failed} de ${data.checked} agenda(s) com problema. Veja a situação abaixo.` });
      await load();
    } catch (err) {
      setNotice({ kind: 'error', text: apiErrorMessage(err, 'Não foi possível verificar as agendas.') });
    } finally {
      setChecking(false);
    }
  };

  const done = (text: string): void => {
    setDialog(null);
    setNotice({ kind: 'ok', text });
    void load();
    void loadWeek();
  };

  const isActive = (m: Meeting): boolean => m.status === 'confirmed' || m.status === 'pending';
  const now = Date.now();
  const active = meetings.filter(isActive);
  const upcoming = active.filter((m) => new Date(m.endAt).getTime() > now);
  const currentWeekEnd = today ? addDays(weekStart(today), 7) : '';
  const todayCount = active.filter((m) => brDate(new Date(m.startAt)) === today).length;
  const weekCount = active.filter((m) => brDate(new Date(m.startAt)) < currentWeekEnd).length;
  const problems = connections.filter((c) => c.syncStatus === 'reauth_required' || c.syncStatus === 'error').length;
  const agentName = (id: string | null): string => agents.find((a) => a.id === id)?.name ?? 'Agente';
  const selectedAgent = agents.some((a) => a.id === agentId) ? agentId : agents[0]?.id ?? '';

  const stats = [
    { label: 'Agendas conectadas', value: connections.length, icon: Link2 },
    { label: 'Reuniões hoje', value: todayCount, icon: CalendarDays },
    { label: 'Reuniões nesta semana', value: weekCount, icon: Video },
    { label: 'Aguardando confirmação', value: upcoming.filter((m) => m.status === 'pending').length, icon: Clock },
    { label: 'Agendas com problema', value: problems, icon: AlertCircle },
  ];

  const connectButton = (provider: CalendarProvider) => (
    <button
      key={provider}
      onClick={() => void connect(provider)}
      disabled={!canManage || connecting !== null}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${PROVIDERS[provider].classes}`}
    >
      <Plus className="h-4 w-4" />
      {connecting === provider ? 'Abrindo…' : PROVIDERS[provider].button}
    </button>
  );

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-semibold text-foreground">Agendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agendas conectadas, reuniões e expediente dos seus agentes. Horário de Brasília.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void check()}
            disabled={checking || connections.length === 0}
            className="btn-ghost flex items-center gap-2 rounded-lg px-3 py-2 text-sm disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            Verificar agendas
          </button>
          {connectButton('google')}
          {connectButton('microsoft')}
        </div>
      </div>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-lg px-3 py-2 text-sm ${notice.kind === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-neural-success/10 text-neural-success'}`}
        >
          {notice.text}
        </p>
      )}
      {loadError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}{' '}
          <button className="underline" onClick={() => { setLoading(true); void load(); }}>Tentar de novo</button>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 shrink-0 text-neural-violet" />
            </div>
            <p className="text-2xl font-display font-semibold text-foreground">{loading || loadError ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {([
          ['connections', 'Agendas conectadas'], ['week', 'Semana'], ['meetings', 'Próximas reuniões'], ['agents', 'Agentes e expediente'],
        ] as Array<[Tab, string]>).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'connections' && (
        loading ? (
          <div className="neural-card h-28 animate-pulse" />
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Calendar className="mb-4 h-10 w-10 text-neural-violet" />
            <h2 className="mb-2 text-lg font-display font-semibold">Nenhuma agenda conectada</h2>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
              Conecte o Google Agenda ou o Microsoft 365 para que seus agentes consultem horários e marquem reuniões.
              {!canManage && ' Peça a um administrador da organização.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">{connectButton('google')}{connectButton('microsoft')}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((c) => (
              <div key={c.id} className="neural-card space-y-4 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{PROVIDERS[c.provider].name}</p>
                  <p className="truncate text-xs text-muted-foreground" title={c.email}>{c.email}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SYNC_STATUS[c.syncStatus].className}`}>
                    {SYNC_STATUS[c.syncStatus].label}
                  </span>
                  {c.lastSyncAt && (
                    <span className="text-xs text-muted-foreground">
                      Última resposta: {brLongDate(brDate(new Date(c.lastSyncAt)))} {brTime(new Date(c.lastSyncAt))}
                    </span>
                  )}
                </div>
                {c.syncError && <p className="text-xs text-destructive">{c.syncError}</p>}
                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    {c.syncStatus === 'reauth_required' && (
                      <button onClick={() => void connect(c.provider)} className="btn-primary rounded-md px-3 py-1.5 text-xs">Reautorizar</button>
                    )}
                    <button
                      onClick={() => setDialog({ kind: 'disconnect', connection: c })}
                      className="flex items-center gap-1 rounded-md border border-neural-danger/20 px-2.5 py-1.5 text-xs text-neural-danger transition-colors hover:bg-neural-danger/10"
                    >
                      <Link2Off className="h-3 w-3" />
                      Desconectar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'week' && week && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{brLongDate(week)} a {brLongDate(addDays(week, 6))}</h2>
            <div className="flex items-center gap-2">
              <button aria-label="Semana anterior" className="btn-ghost rounded-md p-2" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft className="h-4 w-4" /></button>
              <button className="btn-ghost rounded-md px-3 py-1.5 text-xs" onClick={() => setWeek(weekStart(today))}>Hoje</button>
              <button aria-label="Próxima semana" className="btn-ghost rounded-md p-2" onClick={() => setWeek(addDays(week, 7))}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((date) => {
              const items = weekMeetings.filter((m) => isActive(m) && brDate(new Date(m.startAt)) === date);
              return (
                <div key={date} className={`neural-card min-w-0 p-3 md:min-h-32 ${date === today ? 'border-primary/50' : ''}`}>
                  <p className={`mb-2 text-xs font-medium ${date === today ? 'text-primary' : 'text-muted-foreground'}`}>{brLongDate(date)}</p>
                  <div className="space-y-1.5">
                    {items.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setDialog({ kind: 'reschedule', meeting: m })}
                        title={`Reagendar: ${m.title}`}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${m.status === 'pending' ? 'badge-warning' : 'badge-primary'}`}
                      >
                        <span className="block font-medium">{brTime(new Date(m.startAt))}–{brTime(new Date(m.endAt))}</span>
                        <span className="block truncate">{m.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Mostra as reuniões da plataforma. Os outros compromissos da agenda conectada bloqueiam horários, mas o conteúdo deles não é lido nem exibido.
          </p>
        </div>
      )}

      {tab === 'meetings' && (
        <div className="neural-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Próximas reuniões ({UPCOMING_DAYS} dias)</h2>
            <button onClick={() => setDialog({ kind: 'new' })} className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Nova reunião
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{loading ? 'Carregando…' : 'Nenhuma reunião marcada.'}</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Reunião</th><th>Convidado</th><th>Data e hora</th><th>Plataforma</th><th>Situação</th><th>Origem</th><th><span className="sr-only">Ações</span></th></tr>
                </thead>
                <tbody>
                  {upcoming.map((m) => {
                    const { label, icon: Icon } = PLATFORM[m.platform];
                    const start = new Date(m.startAt);
                    return (
                      <tr key={m.id}>
                        <td>
                          <p className="text-sm font-medium text-foreground">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.durationMinutes} min</p>
                        </td>
                        <td className="text-sm">
                          <p>{m.contactName ?? '—'}</p>
                          {m.contactEmail && <p className="text-xs text-muted-foreground">{m.contactEmail}</p>}
                        </td>
                        <td className="whitespace-nowrap text-sm">
                          <p>{brLongDate(brDate(start))}</p>
                          <p className="text-xs text-muted-foreground">{brTime(start)}–{brTime(new Date(m.endAt))}</p>
                        </td>
                        <td><span className="flex items-center gap-1.5 text-xs"><Icon className="h-3.5 w-3.5" />{label}</span></td>
                        <td><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MEETING_STATUS[m.status].className}`}>{MEETING_STATUS[m.status].label}</span></td>
                        <td>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.origin === 'agent' ? 'badge-primary' : 'badge-blue'}`}>
                            {m.origin === 'agent' && <Zap className="h-2.5 w-2.5" />}
                            {m.origin === 'agent' ? agentName(m.agentId) : 'Manual'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            {m.externalMeetUrl && (
                              <a href={m.externalMeetUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir link de ${m.title}`} className="rounded p-1.5 text-muted-foreground hover:text-neural-blue">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button aria-label={`Reagendar ${m.title}`} onClick={() => setDialog({ kind: 'reschedule', meeting: m })} className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                            <button aria-label={`Cancelar ${m.title}`} onClick={() => setDialog({ kind: 'cancel', meeting: m })} className="rounded p-1.5 text-muted-foreground hover:text-neural-danger"><XCircle className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'agents' && tenantId && (
        agents.length === 0 ? (
          <p className="neural-card p-8 text-center text-sm text-muted-foreground">{loading ? 'Carregando…' : 'Crie um agente para configurar o agendamento.'}</p>
        ) : (
          <div className="space-y-6">
            <label className="block max-w-sm space-y-1.5">
              <span className="text-sm font-medium">Agente</span>
              <Select value={selectedAgent} onChange={(e) => setAgentId(e.target.value)} options={agents.map((a) => ({ value: a.id, label: a.name }))} />
            </label>
            <AgentScheduleForm key={selectedAgent} tenantId={tenantId} agentId={selectedAgent} connections={connections} canManage={canManage} />
          </div>
        )
      )}

      {tenantId && dialog?.kind === 'new' && (
        <NewMeetingDialog tenantId={tenantId} connections={connections} onClose={() => setDialog(null)} onDone={done} />
      )}
      {tenantId && dialog?.kind === 'reschedule' && (
        <RescheduleDialog tenantId={tenantId} meeting={dialog.meeting} onClose={() => setDialog(null)} onDone={done} />
      )}
      {tenantId && dialog?.kind === 'cancel' && (
        <ConfirmDialog
          title="Cancelar reunião"
          description={`“${dialog.meeting.title}” será cancelada${dialog.meeting.externalEventId ? ', removida da agenda conectada, e o convidado será avisado por e-mail' : ''}.`}
          action="Cancelar reunião"
          run={async () => { await calendarsApi.cancel(tenantId, dialog.meeting.id); return 'Reunião cancelada.'; }}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {tenantId && dialog?.kind === 'disconnect' && (
        <ConfirmDialog
          title="Desconectar agenda"
          description={`Os agentes que usam ${dialog.connection.email} deixarão de agendar. Para alterar reuniões já marcadas será preciso reconectar esta conta.`}
          action="Desconectar"
          run={async () => disconnectMessage((await calendarsApi.disconnect(tenantId, dialog.connection.id)).data.revocation)}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
    </div>
  );
}
