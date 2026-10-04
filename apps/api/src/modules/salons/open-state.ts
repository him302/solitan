import type { OpenState, OperatingDayDto, OperatingHoursDto } from '@soliton/api-contract';
import { SALON_TIMEZONE } from '@soliton/api-contract';

/** India observes no DST, so Asia/Kolkata is a fixed UTC+05:30 offset. */
const IST_OFFSET_MINUTES = 330;

export interface HoursRow {
  weekday: number;
  openTime: string;
  closeTime: string;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h as number) * 60 + (m as number);
}

/** The salon's local (Asia/Kolkata) weekday (0 = Sunday) and minutes-since-midnight. */
export function localTime(now: Date): { weekday: number; minutes: number } {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return {
    weekday: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/**
 * Derives open/closed from the SERVER clock and stored hours — never a client clock.
 *  - salon not active              → closed
 *  - no hours configured at all    → unconfigured (we do not pretend the salon is open)
 *  - otherwise                     → open iff now is within today's [open, close)
 *
 * This is the SALON's state. It is independent of the (Phase 2) queue status: an active
 * salon whose queue is closed is a perfectly valid state.
 */
export function computeOpenState(
  salonStatus: string,
  hours: readonly HoursRow[],
  now: Date = new Date(),
): OpenState {
  if (salonStatus !== 'active') return 'closed';
  if (hours.length === 0) return 'unconfigured';
  const { weekday, minutes } = localTime(now);
  const today = hours.find((row) => row.weekday === weekday);
  if (!today) return 'closed';
  return minutes >= toMinutes(today.openTime) && minutes < toMinutes(today.closeTime)
    ? 'open'
    : 'closed';
}

/** Expands stored rows into the seven-day DTO. A missing weekday is a closed day. */
export function toHoursDto(rows: readonly HoursRow[]): OperatingHoursDto {
  const byDay = new Map(rows.map((row) => [row.weekday, row]));
  const days: OperatingDayDto[] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const row = byDay.get(weekday);
    days.push({
      weekday,
      isOpen: row !== undefined,
      openTime: row?.openTime ?? null,
      closeTime: row?.closeTime ?? null,
    });
  }
  return { timezone: SALON_TIMEZONE, configured: rows.length > 0, days };
}
