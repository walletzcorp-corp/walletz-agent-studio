import { Injectable } from '@nestjs/common';
import { brasiliaDate, dayKeyOf, nextDate, zonedToUtc } from './time-zone.util';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AvailabilityWindow {
  start: string;  /* HH:mm */
  end: string;    /* HH:mm */
  enabled: boolean;
}

export interface AvailabilityHours {
  mon?: AvailabilityWindow;
  tue?: AvailabilityWindow;
  wed?: AvailabilityWindow;
  thu?: AvailabilityWindow;
  fri?: AvailabilityWindow;
  sat?: AvailabilityWindow;
  sun?: AvailabilityWindow;
}

/** Horários oferecidos começam em múltiplos de 15 minutos. */
const SLOT_STEP_MS = 15 * 60_000;
const alignToStep = (ms: number): number => Math.ceil(ms / SLOT_STEP_MS) * SLOT_STEP_MS;

@Injectable()
export class AvailabilityService {
  /**
   * Computes free slots given:
   * - Available hours config per weekday
   * - Existing busy blocks (from one or more calendar sources)
   * - Slot duration + buffer
   * - Date range to search within
   * Expediente em horário de Brasília, independente do fuso do servidor.
   */
  computeFreeSlots(
    busyBlocks: TimeSlot[],
    availableHours: AvailabilityHours,
    durationMinutes: number,
    bufferMinutes: number,
    rangeStart: Date,
    rangeEnd: Date,
  ): TimeSlot[] {
    const slotMs = durationMinutes * 60_000;
    const bufferMs = bufferMinutes * 60_000;
    const results: TimeSlot[] = [];

    /* Dia a dia no calendário de Brasília */
    const lastDate = brasiliaDate(rangeEnd);
    for (let date = brasiliaDate(rangeStart); date <= lastDate; date = nextDate(date)) {
      const window = availableHours[dayKeyOf(date)];

      if (window?.enabled && window.start && window.end) {
        const windowStart = zonedToUtc(date, window.start);
        const windowEnd = zonedToUtc(date, window.end);

        /* Clamp to range */
        const effectiveStart = windowStart < rangeStart ? rangeStart : windowStart;
        const effectiveEnd = windowEnd > rangeEnd ? rangeEnd : windowEnd;

        /* Generate slots within window, skipping busy blocks */
        let cursor = alignToStep(effectiveStart.getTime());
        while (cursor + slotMs <= effectiveEnd.getTime()) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(cursor + slotMs);

          const isBusy = busyBlocks.some(
            (b) => slotStart < b.end && slotEnd > b.start,
          );

          if (!isBusy) {
            results.push({ start: slotStart, end: slotEnd });
            cursor = alignToStep(cursor + slotMs + bufferMs);
          } else {
            /* Jump past the conflicting block */
            const conflict = busyBlocks.find(
              (b) => slotStart < b.end && slotEnd > b.start,
            );
            cursor = conflict ? alignToStep(conflict.end.getTime() + bufferMs) : cursor + SLOT_STEP_MS;
          }
        }
      }
    }

    return results;
  }

  /**
   * Checks whether a specific time slot is free given busy blocks.
   * Used for double-booking prevention before confirming.
   */
  isSlotFree(start: Date, end: Date, busyBlocks: TimeSlot[]): boolean {
    return !busyBlocks.some((b) => start < b.end && end > b.start);
  }

  /**
   * Remove um intervalo dos blocos ocupados. Usado ao reagendar: o evento da
   * própria reunião não pode bloquear o novo horário dela.
   */
  subtractBlock(blocks: TimeSlot[], hole: TimeSlot): TimeSlot[] {
    return blocks.flatMap((b) => {
      if (b.end <= hole.start || b.start >= hole.end) return [b];
      const rest: TimeSlot[] = [];
      if (b.start < hole.start) rest.push({ start: b.start, end: hole.start });
      if (b.end > hole.end) rest.push({ start: hole.end, end: b.end });
      return rest;
    });
  }

  /**
   * Merges overlapping/adjacent busy blocks (reduces redundancy).
   */
  mergeBusyBlocks(blocks: TimeSlot[]): TimeSlot[] {
    if (!blocks.length) return [];
    const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
    const first = sorted[0];
    if (!first) return [];
    const merged: TimeSlot[] = [{ start: first.start, end: first.end }];
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i];
      const last = merged[merged.length - 1];
      if (!curr || !last) continue;
      if (curr.start <= last.end) {
        last.end = curr.end > last.end ? curr.end : last.end;
      } else {
        merged.push({ start: curr.start, end: curr.end });
      }
    }
    return merged;
  }
}
