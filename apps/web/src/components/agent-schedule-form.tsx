'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button, Select, Skeleton } from '@walletz/ui';
import {
  apiErrorMessage, calendarsApi,
  type AgentScheduleSettings, type CalendarConnection, type DayKey, type DayWindow, type MeetingPlatform,
} from '../lib/calendars-api';

const DAYS: Array<[DayKey, string]> = [
  ['mon', 'Segunda'], ['tue', 'Terça'], ['wed', 'Quarta'], ['thu', 'Quinta'],
  ['fri', 'Sexta'], ['sat', 'Sábado'], ['sun', 'Domingo'],
];
const PLATFORMS: Array<{ value: MeetingPlatform; label: string }> = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'phone', label: 'Telefone' },
];
const DURATIONS = [15, 30, 45, 60, 90, 120];
const BUFFERS = [0, 5, 10, 15, 30, 60];
const LEAD_TIMES: Array<[number, string]> = [
  [0, 'Sem antecedência'], [30, '30 minutos'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'],
  [720, '12 horas'], [1440, '1 dia'], [2880, '2 dias'],
];

const weekday: DayWindow = { enabled: true, start: '09:00', end: '18:00' };
const off: DayWindow = { enabled: false, start: null, end: null };
const DEFAULTS: AgentScheduleSettings = {
  canSchedule: false,
  connectionId: null,
  defaultDurationMinutes: 30,
  bufferMinutes: 15,
  minLeadTimeMinutes: 120,
  defaultPlatform: 'google_meet',
  availableHours: { mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri: weekday, sat: off, sun: off },
};

/** Inclui o valor salvo mesmo que não esteja entre as opções, para não trocá-lo sem querer. */
function withCurrent(options: Array<{ value: string; label: string }>, value: number, unit: string): Array<{ value: string; label: string }> {
  return options.some((o) => o.value === String(value)) ? options : [...options, { value: String(value), label: `${value} ${unit}` }];
}

interface Props {
  tenantId: string;
  agentId: string;
  connections: CalendarConnection[];
  /** Só administradores salvam (a API também exige). */
  canManage: boolean;
}

/** Liga uma agenda ao agente e define o expediente em que ele pode marcar reuniões. */
export function AgentScheduleForm({ tenantId, agentId, connections, canManage }: Props) {
  const [form, setForm] = useState<AgentScheduleSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    setForm(null);
    setMessage(null);
    calendarsApi.agentSettings(tenantId, agentId)
      .then(({ data }) => {
        if (!active) return;
        setForm(data ? { ...DEFAULTS, ...data, availableHours: { ...DEFAULTS.availableHours, ...data.availableHours } } : DEFAULTS);
      })
      .catch((err: unknown) => {
        if (active) setMessage({ kind: 'error', text: apiErrorMessage(err, 'Não foi possível carregar a configuração.') });
      });
    return () => { active = false; };
  }, [tenantId, agentId]);

  if (!form) {
    return message
      ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{message.text}</p>
      : <Skeleton className="h-64 w-full" />;
  }

  const set = <K extends keyof AgentScheduleSettings>(key: K, value: AgentScheduleSettings[K]): void => {
    setMessage(null);
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };
  const setDay = (day: DayKey, patch: Partial<DayWindow>): void => {
    const current = form.availableHours[day] ?? off;
    set('availableHours', { ...form.availableHours, [day]: { ...current, ...patch } });
  };

  const connected = connections.find((c) => c.id === form.connectionId);
  // A agenda salva foi desconectada: mostra como "nenhuma" e pede nova escolha.
  const missing = !!form.connectionId && !connected;
  const selected = connected?.id ?? '';

  const problem = (): string | null => {
    if (form.canSchedule && !connected) return 'Escolha uma agenda conectada para o agente poder agendar.';
    const enabled = DAYS.filter(([d]) => form.availableHours[d]?.enabled);
    if (form.canSchedule && enabled.length === 0) return 'Habilite pelo menos um dia de atendimento.';
    for (const [d, label] of enabled) {
      const w = form.availableHours[d];
      if (!w?.start || !w.end || w.start >= w.end) return `${label}: o início deve ser antes do fim.`;
    }
    return null;
  };

  const save = async (): Promise<void> => {
    const invalid = problem();
    if (invalid) { setMessage({ kind: 'error', text: invalid }); return; }
    setSaving(true);
    setMessage(null);
    try {
      await calendarsApi.saveAgentSettings(tenantId, agentId, {
        canSchedule: form.canSchedule,
        connectionId: connected?.id ?? null,
        defaultDurationMinutes: form.defaultDurationMinutes,
        bufferMinutes: form.bufferMinutes,
        minLeadTimeMinutes: form.minLeadTimeMinutes,
        defaultPlatform: form.defaultPlatform,
        availableHours: form.availableHours,
      });
      setForm((f) => (f ? { ...f, connectionId: connected?.id ?? null } : f));
      setMessage({ kind: 'ok', text: 'Configuração de agendamento salva.' });
    } catch (err) {
      setMessage({ kind: 'error', text: apiErrorMessage(err, 'Não foi possível salvar.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <fieldset disabled={!canManage || saving} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="neural-card space-y-4 p-6">
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold text-foreground">Agente pode agendar</span>
                <span className="block text-xs text-muted-foreground">
                  Consulta a agenda, marca, reagenda e cancela reuniões nas conversas.
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-primary"
                checked={form.canSchedule}
                onChange={(e) => set('canSchedule', e.target.checked)}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Agenda usada pelo agente</span>
              <Select
                value={selected}
                onChange={(e) => set('connectionId', e.target.value || null)}
                options={[
                  { value: '', label: 'Nenhuma agenda' },
                  ...connections.map((c) => ({
                    value: c.id,
                    label: `${c.email} (${c.provider === 'google' ? 'Google' : 'Microsoft'})${c.syncStatus === 'reauth_required' ? ' · precisa reautorizar' : ''}`,
                  })),
                ]}
              />
            </label>
            {missing && (
              <p role="alert" className="text-xs text-destructive">
                A agenda que este agente usava foi desconectada. Escolha outra e salve.
              </p>
            )}
            {connections.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma agenda conectada. <Link href="/agendas" className="text-primary hover:underline">Conecte em Agendas</Link>.
              </p>
            )}
          </div>

          <div className="neural-card space-y-4 p-6">
            <h3 className="text-sm font-semibold text-foreground">Reuniões</h3>
            <label className="block space-y-1.5">
              <span className="text-sm">Duração padrão</span>
              <Select
                value={String(form.defaultDurationMinutes)}
                onChange={(e) => set('defaultDurationMinutes', Number(e.target.value))}
                options={withCurrent(DURATIONS.map((m) => ({ value: String(m), label: `${m} minutos` })), form.defaultDurationMinutes, 'minutos')}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm">Intervalo entre horários oferecidos</span>
              <Select
                value={String(form.bufferMinutes)}
                onChange={(e) => set('bufferMinutes', Number(e.target.value))}
                options={withCurrent(BUFFERS.map((m) => ({ value: String(m), label: m ? `${m} minutos` : 'Sem intervalo' })), form.bufferMinutes, 'minutos')}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm">Antecedência mínima dos horários oferecidos</span>
              <Select
                value={String(form.minLeadTimeMinutes)}
                onChange={(e) => set('minLeadTimeMinutes', Number(e.target.value))}
                options={withCurrent(LEAD_TIMES.map(([m, label]) => ({ value: String(m), label })), form.minLeadTimeMinutes, 'minutos')}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm">Plataforma padrão</span>
              <Select
                value={form.defaultPlatform}
                onChange={(e) => set('defaultPlatform', e.target.value as MeetingPlatform)}
                options={PLATFORMS}
              />
            </label>
          </div>
        </div>

        <div className="neural-card space-y-4 p-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Expediente</h3>
            <p className="text-xs text-muted-foreground">Horários que o agente oferece, sempre no horário de Brasília.</p>
          </div>
          {DAYS.map(([day, label]) => {
            const w = form.availableHours[day] ?? off;
            return (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <label className="flex w-28 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={w.enabled}
                    onChange={(e) => setDay(day, e.target.checked
                      ? { enabled: true, start: w.start ?? '09:00', end: w.end ?? '18:00' }
                      : { enabled: false })}
                  />
                  {label}
                </label>
                {w.enabled ? (
                  <span className="flex items-center gap-2">
                    <input
                      type="time" aria-label={`${label}: início`} value={w.start ?? ''}
                      onChange={(e) => setDay(day, { start: e.target.value })}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground [color-scheme:dark]"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <input
                      type="time" aria-label={`${label}: fim`} value={w.end ?? ''}
                      onChange={(e) => setDay(day, { end: e.target.value })}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-foreground [color-scheme:dark]"
                    />
                  </span>
                ) : (
                  <span className="text-xs italic text-muted-foreground">Sem atendimento</span>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-lg px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-neural-success/10 text-neural-success'}`}
        >
          {message.text}
        </p>
      )}
      {canManage ? (
        <Button onClick={() => void save()} loading={saving}>
          {!saving && <CheckCircle2 className="h-4 w-4" />}
          Salvar configuração
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Só administradores da organização podem alterar estas configurações.</p>
      )}
    </div>
  );
}
