/**
 * Phase 4 appointment contracts — shared between API and clients.
 * Covers the full appointment lifecycle: SCHEDULED → CONFIRMED → CHECKED_IN
 * → IN_SERVICE → COMPLETED, with CANCELLED and NO_SHOW as terminal exits.
 */
import { z } from 'zod';

// ── Status ─────────────────────────────────────────────────────────────────

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'checked_in',
  'in_service',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface AppointmentDto {
  id: string;
  salonId: string;
  salonName: string;
  salonAddress: string | null;
  salonCity: string | null;
  serviceId: string;
  serviceName: string;
  servicePriceCents: number;
  serviceDurationMinutes: number;
  staffId: string | null;
  scheduledAt: string;          // ISO-8601
  durationMinutes: number;      // effective duration (override or service default)
  status: AppointmentStatus;
  notes: string | null;
  /** ISO-8601 time when the customer tapped "I'm On My Way". */
  arrivalNotifiedAt: string | null;
  /** ISO-8601 deadline after which the appointment becomes no_show. */
  graceExpiresAt: string | null;
  /** Queue entry ID once the appointment has been checked in. */
  linkedEntryId: string | null;
  /** Derived: recommended arrival time = scheduledAt − travelBufferMin. ISO-8601. */
  recommendedArrivalAt: string;
  /** Derived: minutes before scheduledAt the customer should arrive. */
  travelBufferMin: number;
  createdAt: string;
}

/** Lightweight card used in lists. */
export interface AppointmentSummaryDto {
  id: string;
  salonId: string;
  salonName: string;
  serviceId: string;
  serviceName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  linkedEntryId: string | null;
}

/** One available booking slot. */
export interface AvailabilitySlot {
  startsAt: string;   // ISO-8601
  endsAt: string;     // ISO-8601
  available: boolean;
  reason?: string;    // why unavailable (capacity, outside hours, etc.)
}

// ── Input schemas ──────────────────────────────────────────────────────────

export const createAppointmentSchema = z
  .object({
    salonId: z.string().uuid(),
    serviceId: z.string().uuid(),
    scheduledAt: z.string().datetime({ offset: true }),
    notes: z.string().max(500).optional(),
    idempotencyKey: z.string().min(1).max(128).optional(),
  })
  .strict();
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const getAvailabilitySchema = z
  .object({
    serviceId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  })
  .strict();
export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;

export const listSalonAppointmentsSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
    status: z.enum([...APPOINTMENT_STATUSES, 'all'] as [string, ...string[]]).optional(),
  })
  .strict();
export type ListSalonAppointmentsInput = z.infer<typeof listSalonAppointmentsSchema>;

// ── Realtime events ────────────────────────────────────────────────────────

export type AppointmentEventType =
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.cancelled'
  | 'appointment.checked_in'
  | 'appointment.no_show'
  | 'appointment.completed'
  | 'appointment.customer_on_way';
