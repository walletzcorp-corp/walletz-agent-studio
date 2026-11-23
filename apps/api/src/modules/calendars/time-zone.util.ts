/** Todo o agendamento usa o horário de Brasília, qualquer que seja o fuso do servidor. */
export const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

function wallClock(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

function offsetMs(instant: Date, timeZone: string): number {
  return wallClock(instant, timeZone) - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Instante UTC de um horário de parede (YYYY-MM-DD + HH:mm[:ss]) no fuso informado. */
export function zonedToUtc(date: string, time: string, timeZone = BRASILIA_TIME_ZONE): Date {
  const wall = Date.parse(`${date}T${time.length === 5 ? `${time}:00` : time}Z`);
  if (Number.isNaN(wall)) return new Date(NaN);
  const first = wall - offsetMs(new Date(wall), timeZone);
  // Segunda passada: o deslocamento pode mudar perto de virada de horário de verão.
  return new Date(wall - offsetMs(new Date(first), timeZone));
}

/** Meia-noite de uma data no fuso informado. */
export function zonedMidnight(date: string, timeZone = BRASILIA_TIME_ZONE): Date {
  return zonedToUtc(date.slice(0, 10), '00:00', timeZone);
}

/** Data (YYYY-MM-DD) em que um instante cai em Brasília. */
export function brasiliaDate(instant: Date): string {
  return new Date(wallClock(instant, BRASILIA_TIME_ZONE)).toISOString().slice(0, 10);
}

/** Dia seguinte de uma data YYYY-MM-DD. */
export function nextDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** Dia da semana de uma data YYYY-MM-DD. */
export function dayKeyOf(date: string): DayKey {
  return DAY_KEYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
}

/**
 * Lê data/hora ISO. Sem fuso (ex.: "2026-12-01T14:00", comum em respostas de IA)
 * é horário de Brasília — o padrão do JS seria o fuso do servidor.
 */
export function parseDateTime(value: string): Date {
  const text = value.trim();
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return new Date(text);
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?$/.exec(text);
  return m ? zonedToUtc(m[1]!, m[2]!) : new Date(NaN);
}

/** ISO com o deslocamento de Brasília (ex.: 2026-12-01T14:00:00-03:00), para a IA não converter errado. */
export function toBrasiliaIso(instant: Date): string {
  const offset = offsetMs(instant, BRASILIA_TIME_ZONE) / 60_000;
  const abs = Math.abs(offset);
  const pad = (n: number): string => String(n).padStart(2, '0');
  const wall = new Date(wallClock(instant, BRASILIA_TIME_ZONE)).toISOString().slice(0, 19);
  return `${wall}${offset < 0 ? '-' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
