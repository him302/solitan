/**
 * Deterministic appointment slot generator.
 *
 * Generates HH:mm slots from salon operating hours, slots each service-duration
 * apart. A slot is unavailable when existing appointments at that time ≥ active
 * chair count (capacity limit). No paid APIs, no AI, no randomness.
 */

export interface SlotInput {
  /** Salon opening time, HH:mm (e.g. "09:00"). */
  openTime: string;
  /** Salon closing time, HH:mm. The last slot start must allow the service to finish by this time. */
  closeTime: string;
  /** Service duration in minutes. */
  serviceDurationMinutes: number;
  /** Number of active chairs in the salon. */
  activeChairs: number;
  /** ISO-8601 date string (YYYY-MM-DD) for which to generate slots. */
  date: string;
  /** Appointments already booked on this date (any status that occupies a slot). */
  existingAppointments: Array<{
    scheduledAt: Date;
    durationMinutes: number;
  }>;
  /** Current server time — slots in the past are unavailable. */
  now: Date;
}

export interface Slot {
  startsAt: string;   // ISO-8601
  endsAt: string;     // ISO-8601
  available: boolean;
  reason?: string;
}

function parseHHmm(hhmm: string, date: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${date}T00:00:00.000Z`);
  // Use local-midnight of the date string and offset by hours/minutes so that
  // "09:00" always means 09:00 in the slot's calendar day regardless of server TZ.
  // For V1 we treat all times as UTC (salon timezone = UTC placeholder).
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function countOverlaps(
  slotStart: Date,
  slotEnd: Date,
  appointments: Array<{ scheduledAt: Date; durationMinutes: number }>,
): number {
  return appointments.filter(({ scheduledAt, durationMinutes }) => {
    const apptEnd = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
    return scheduledAt < slotEnd && apptEnd > slotStart;
  }).length;
}

export function generateSlots(input: SlotInput): Slot[] {
  const {
    openTime,
    closeTime,
    serviceDurationMinutes,
    activeChairs,
    date,
    existingAppointments,
    now,
  } = input;

  const open = parseHHmm(openTime, date);
  const close = parseHHmm(closeTime, date);
  const stepMs = serviceDurationMinutes * 60_000;

  if (open >= close || stepMs <= 0 || activeChairs <= 0) return [];

  const slots: Slot[] = [];
  let cursor = new Date(open);

  while (cursor.getTime() + stepMs <= close.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + stepMs);

    let available = true;
    let reason: string | undefined;

    if (slotStart <= now) {
      available = false;
      reason = 'past';
    } else {
      const occupied = countOverlaps(slotStart, slotEnd, existingAppointments);
      if (occupied >= activeChairs) {
        available = false;
        reason = 'full';
      }
    }

    slots.push({
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
      available,
      reason,
    });

    cursor = new Date(cursor.getTime() + stepMs);
  }

  return slots;
}
