/**
 * Booking and queue contracts (Phase 2). Customers join a virtual queue by booking
 * a service. The queue progresses in real-time via @soliton/realtime-client.
 */
import { z } from 'zod';

export const BOOKING_STATUSES = [
  'pending',
  'waiting',
  'serving',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface BookingDto {
  id: string;
  salonId: string;
  salonName: string;
  salonAddress: string | null;
  serviceId: string;
  serviceName: string;
  /** Integer minor units (paise). */
  servicePriceCents: number;
  serviceDurationMinutes: number;
  status: BookingStatus;
  tokenNumber: number | null;
  createdAt: string;
  /** People currently ahead of this booking in the queue. */
  queuePositionAhead: number | null;
  /** Estimated waiting time in minutes. Null when queue info is unavailable. */
  etaMinutes: number | null;
}

export const createBookingSchema = z
  .object({
    salonId: z.string().min(1),
    serviceId: z.string().min(1),
  })
  .strict();
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export interface QueueStateDto {
  salonId: string;
  /** The token number currently being served. Null when queue is empty. */
  currentToken: number | null;
  totalWaiting: number;
  etaMinutes: number | null;
  version: number;
}
