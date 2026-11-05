import { Injectable } from '@nestjs/common';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AvailabilityWindow {
  start: string /* HH:mm */;
  end: string /* HH:mm */;
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

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

@Injectable()
export class AvailabilityService {
  /**
   * Computes free slots given:
   * - Available hours config per weekday
   * - Existing busy blocks (from one or more calendar sources)
   * - Slot duration + buffer
   * - Date range to search within
   */
  computeFreeSlots(
    busyBlocks: TimeSlot[],
    availableHours: AvailabilityHours,
    durationMinutes: number,
    bufferMinutes: number,
    rangeStart: Date,
    rangeEnd: Date,
    _timeZoneOffset = -3 /* UTC-3 default for BRT */,
  ): TimeSlot[] {
    const slotMs = durationMinutes * 60_000;
    const bufferMs = bufferMinutes * 60_000;
    const results: TimeSlot[] = [];

    /* Iterate day by day */
    const current = new Date(rangeStart);
    current.setHours(0, 0, 0, 0);

    while (current <= rangeEnd) {
      const dayKey = DAY_KEYS[current.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6]!;
      const window = availableHours[dayKey];

      if (window?.enabled && window.start && window.end) {
        const startParts = window.start.split(':');
        const endParts = window.end.split(':');
        const sh = Number(startParts[0] ?? 0);
        const sm = Number(startParts[1] ?? 0);
        const eh = Number(endParts[0] ?? 18);
        const em = Number(endParts[1] ?? 0);

        const windowStart = new Date(current);
        windowStart.setHours(sh, sm, 0, 0);

        const windowEnd = new Date(current);
        windowEnd.setHours(eh, em, 0, 0);

        /* Clamp to range */
        const effectiveStart = windowStart < rangeStart ? rangeStart : windowStart;
        const effectiveEnd = windowEnd > rangeEnd ? rangeEnd : windowEnd;

        /* Generate slots within window, skipping busy blocks */
        let cursor = effectiveStart.getTime();
        while (cursor + slotMs <= effectiveEnd.getTime()) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(cursor + slotMs);

          const isBusy = busyBlocks.some((b) => slotStart < b.end && slotEnd > b.start);

          if (!isBusy) {
            results.push({ start: slotStart, end: slotEnd });
            cursor += slotMs + bufferMs;
          } else {
            /* Jump past the conflicting block */
            const conflict = busyBlocks.find((b) => slotStart < b.end && slotEnd > b.start);
            cursor = conflict ? conflict.end.getTime() + bufferMs : cursor + 60_000;
          }
        }
      }

      current.setDate(current.getDate() + 1);
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
