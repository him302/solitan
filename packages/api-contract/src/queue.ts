/**
 * Phase 3 queue contracts — shared between API and clients.
 * All monetary values are integer minor units (paise). BigInt queue versions
 * are serialised as strings over the wire.
 */
import { z } from 'zod';
import type { BookingStatus } from './booking';
import type { QueueStatus } from './salon';

// ── Entry state (mirrors Prisma EntryState enum) ───────────────────────────

export const ENTRY_STATES = [
  'waiting',
  'notified',
  'checked_in',
  'in_service',
  'completed',
  'no_show',
  'cancelled',
  'bumped',
] as const;
export type EntryState = (typeof ENTRY_STATES)[number];

// ── DTOs ───────────────────────────────────────────────────────────────────

/** Full entry detail returned to both customer and staff. */
export interface QueueEntryDto {
  id: string;
  salonId: string;
  salonName: string;
  salonAddress: string | null;
  serviceId: string;
  serviceName: string;
  servicePriceCents: number;
  serviceDurationMinutes: number;
  /** Assigned token number (null until token is generated — should not happen in practice). */
  tokenNumber: number;
  /** Customer-visible state (maps EntryState to simpler BookingStatus for backward compat). */
  status: BookingStatus;
  /** Raw backend state (staff-facing). */
  entryState: EntryState;
  /** People currently waiting ahead of this entry in the queue. */
  queuePositionAhead: number | null;
  /** Estimated waiting time in minutes. */
  etaMinutes: number | null;
  /** Assigned chair label (when in_service). */
  chairLabel: string | null;
  /** ISO timestamp when customer physically arrived at salon. */
  arrivedAt: string | null;
  /** Customer-reported delay in minutes (I'm Late). null = not reported. */
  lateMinutes: number | null;
  /** How the owner responded to a late report (kept/moved/skipped). */
  lateAction: string | null;
  /** Preferred staff member name (informational). */
  preferredStaffName: string | null;
  /** Assigned time slot start. */
  slotStartAt: string | null;
  /** Assigned time slot end. */
  slotEndAt: string | null;
  createdAt: string;
  /** Server queue version at the time this DTO was generated. */
  queueVersion: string;
}

/** Authoritative salon-level queue snapshot emitted by snapshot:request. */
export interface SalonQueueSnapshot {
  salonId: string;
  status: QueueStatus;
  /** Token number currently being served (null when no active entry). */
  currentToken: number | null;
  /** Entries currently waiting (not yet started). */
  waitingCount: number;
  /** Active chairs in service. */
  activeChairs: number;
  /** Estimated wait in minutes for the next person joining now. */
  etaMinutes: number | null;
  /** Monotonically increasing version (serialised BigInt). */
  version: string;
  /** Waiting entry list for staff dashboard. */
  entries: StaffEntryRow[];
}

/** Lightweight row used in the staff live dashboard. */
export interface StaffEntryRow {
  id: string;
  tokenNumber: number;
  serviceName: string;
  serviceDurationMinutes: number;
  entryState: EntryState;
  etaMinutes: number | null;
  chairLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  arrivedAt: string | null;
  lateMinutes: number | null;
  lateAction: string | null;
  preferredStaffName: string | null;
  slotStartAt: string | null;
  slotEndAt: string | null;
  createdAt: string;
}

// ── HTTP input schemas ─────────────────────────────────────────────────────

export const joinQueueSchema = z
  .object({
    salonId: z.string().uuid(),
    serviceId: z.string().uuid(),
    preferredStaffId: z.string().uuid().optional(),
  })
  .strict();
export type JoinQueueInput = z.infer<typeof joinQueueSchema>;

export const lateReportSchema = z
  .object({
    minutes: z.number().int().min(5).max(60),
  })
  .strict();
export type LateReportInput = z.infer<typeof lateReportSchema>;

export const lateResponseSchema = z
  .object({
    action: z.enum(['keep', 'move_behind', 'skip', 'contact']),
  })
  .strict();
export type LateResponseInput = z.infer<typeof lateResponseSchema>;

export const changeServiceSchema = z
  .object({
    serviceId: z.string().uuid(),
  })
  .strict();
export type ChangeServiceInput = z.infer<typeof changeServiceSchema>;

export const announcementSchema = z
  .object({
    type: z.enum(['info', 'delay', 'paused', 'closed', 'reopened']).default('info'),
    body: z.string().trim().min(1).max(500),
    entryId: z.string().uuid().optional(),
  })
  .strict();
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export interface SalonAnnouncementDto {
  id: string;
  salonId: string;
  type: string;
  body: string;
  createdAt: string;
  entryId: string | null;
}

export const staffActionSchema = z
  .object({
    chairId: z.string().uuid().optional(),
  })
  .strict();
export type StaffActionInput = z.infer<typeof staffActionSchema>;

export const queueControlSchema = z.object({}).strict();
export type QueueControlInput = z.infer<typeof queueControlSchema>;

// ── Realtime event types ───────────────────────────────────────────────────

export type QueueEventType =
  | 'queue.entry.joined'
  | 'queue.entry.notified'
  | 'queue.entry.checked_in'
  | 'queue.entry.arrived'
  | 'queue.entry.started'
  | 'queue.entry.completed'
  | 'queue.entry.no_show'
  | 'queue.entry.cancelled'
  | 'queue.entry.late_reported'
  | 'queue.entry.service_changed'
  | 'queue.paused'
  | 'queue.resumed'
  | 'queue.closed'
  | 'queue.limited'
  | 'queue.opened'
  | 'queue.announcement';
