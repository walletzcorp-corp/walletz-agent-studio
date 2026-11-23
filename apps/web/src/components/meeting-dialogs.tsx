'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Select,
} from '@walletz/ui';
import {
  addDays, apiErrorMessage, brDate, brTime, calendarsApi, fromBrasilia,
  type CalendarConnection, type Meeting, type MeetingPlatform,
} from '../lib/calendars-api';

const DURATIONS = [15, 30, 45, 60, 90, 120];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function ErrorText({ text }: { text: string | null }) {
  return text ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{text}</p> : null;
}

function durationOptions(current: number): Array<{ value: string; label: string }> {
  return [...new Set([...DURATIONS, current])].sort((a, b) => a - b).map((m) => ({ value: String(m), label: `${m} minutos` }));
}

interface CreateProps {
  tenantId: string;
  connections: CalendarConnection[];
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Montado só quando aberto, então cada abertura começa limpa. */
export function NewMeetingDialog({ tenantId, connections, onClose, onDone }: CreateProps) {
  const [title, setTitle] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [date, setDate] = useState(addDays(brDate(new Date()), 1));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? '');
  const [platform, setPlatform] = useState<MeetingPlatform>(connections[0]?.provider === 'microsoft' ? 'teams' : connections[0] ? 'google_meet' : 'presencial');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = connections.find((c) => c.id === connectionId)?.provider;
  // Link de vídeo só existe no provedor da agenda escolhida.
  const platforms: Array<{ value: MeetingPlatform; label: string }> = [
    ...(provider === 'google' ? [{ value: 'google_meet' as const, label: 'Google Meet' }] : []),
    ...(provider === 'microsoft' ? [{ value: 'teams' as const, label: 'Microsoft Teams' }] : []),
    { value: 'presencial', label: 'Presencial' },
    { value: 'phone', label: 'Telefone' },
  ];
  const chooseConnection = (id: string): void => {
    setConnectionId(id);
    const p = connections.find((c) => c.id === id)?.provider;
    setPlatform(p === 'google' ? 'google_meet' : p === 'microsoft' ? 'teams' : 'presencial');
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const start = fromBrasilia(date, time);
    if (start.getTime() <= Date.now()) { setError('Escolha um horário no futuro.'); return; }
    setSaving(true);
    setError(null);
    try {
      const { data } = await calendarsApi.createMeeting(tenantId, {
        title: title.trim(),
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        startAt: start.toISOString(),
        endAt: new Date(start.getTime() + duration * 60_000).toISOString(),
        platform,
        connectionId: connectionId || undefined,
      });
      const invited = data.status === 'confirmed' && contactEmail.trim() ? ' O convite foi enviado ao convidado.' : '';
      onDone(data.status === 'confirmed'
        ? `Reunião confirmada na agenda.${invited}`
        : 'Reunião registrada como pendente, porque nenhuma agenda foi escolhida. Nenhum convite foi enviado.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível criar a reunião.'));
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="new-meeting-title" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="new-meeting-title">Nova reunião</DialogTitle>
          <DialogDescription>Horário de Brasília.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field label="Título"><Input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome do convidado"><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
            <Field label="E-mail do convidado"><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data"><Input className="[color-scheme:dark]" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Início"><Input className="[color-scheme:dark]" type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Duração">
              <Select value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))} options={durationOptions(duration)} />
            </Field>
          </div>
          <Field label="Agenda">
            <Select
              value={connectionId}
              onChange={(e) => chooseConnection(e.target.value)}
              options={[
                ...connections.map((c) => ({ value: c.id, label: `${c.email} (${c.provider === 'google' ? 'Google' : 'Microsoft'})` })),
                { value: '', label: 'Nenhuma (fica pendente)' },
              ]}
            />
          </Field>
          <Field label="Plataforma">
            <Select value={platform} onChange={(e) => setPlatform(e.target.value as MeetingPlatform)} options={platforms} />
          </Field>
          <ErrorText text={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Fechar</Button>
            <Button type="submit" loading={saving}>Criar reunião</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MeetingProps {
  tenantId: string;
  meeting: Meeting;
  onClose: () => void;
  onDone: (message: string) => void;
}

export function RescheduleDialog({ tenantId, meeting, onClose, onDone }: MeetingProps) {
  const [date, setDate] = useState(brDate(new Date(meeting.startAt)));
  const [time, setTime] = useState(brTime(new Date(meeting.startAt)));
  const [duration, setDuration] = useState(meeting.durationMinutes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const start = fromBrasilia(date, time);
    if (start.getTime() <= Date.now()) { setError('Escolha um horário no futuro.'); return; }
    setSaving(true);
    setError(null);
    try {
      await calendarsApi.reschedule(tenantId, meeting.id, {
        startAt: start.toISOString(),
        endAt: new Date(start.getTime() + duration * 60_000).toISOString(),
      });
      onDone('Reunião reagendada.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível reagendar.'));
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogContent role="dialog" aria-modal="true" aria-labelledby="reschedule-title">
        <DialogHeader>
          <DialogTitle id="reschedule-title">Reagendar reunião</DialogTitle>
          <DialogDescription>{meeting.title}. Horário de Brasília.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data"><Input className="[color-scheme:dark]" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Início"><Input className="[color-scheme:dark]" type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Duração">
              <Select value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))} options={durationOptions(duration)} />
            </Field>
          </div>
          <ErrorText text={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Fechar</Button>
            <Button type="submit" loading={saving}>Reagendar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmProps {
  title: string;
  description: string;
  action: string;
  run: () => Promise<string>;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Confirmação de ação destrutiva; o erro aparece aqui e a ação pode ser repetida. */
export function ConfirmDialog({ title, description, action, run, onClose, onDone }: ConfirmProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      onDone(await run());
    } catch (err) {
      setError(apiErrorMessage(err, 'A ação falhou. Tente de novo.'));
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={onClose}>
      <DialogContent role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <DialogHeader>
          <DialogTitle id="confirm-title">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ErrorText text={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Voltar</Button>
          <Button variant="destructive" onClick={() => void confirm()} loading={saving}>{action}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
