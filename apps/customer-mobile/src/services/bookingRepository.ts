/**
 * In-memory booking repository for Phase 2 UI development.
 * Replace with real API calls when the backend implements /bookings endpoints.
 *
 * All operations are async to match the future API contract shape.
 */
import type { BookingDto, BookingStatus } from '@soliton/api-contract';

let _nextToken = 27;
const _bookings: BookingDto[] = [];

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface CreateBookingArgs {
  salonId: string;
  salonName: string;
  salonAddress: string | null;
  serviceId: string;
  serviceName: string;
  servicePriceCents: number;
  serviceDurationMinutes: number;
}

export const bookingRepository = {
  async create(args: CreateBookingArgs): Promise<BookingDto> {
    const token = _nextToken++;
    const ahead = Math.max(0, Math.floor(Math.random() * 8) + 1);
    const eta = Math.round(ahead * (args.serviceDurationMinutes || 30));
    const booking: BookingDto = {
      id: makeId(),
      salonId: args.salonId,
      salonName: args.salonName,
      salonAddress: args.salonAddress,
      serviceId: args.serviceId,
      serviceName: args.serviceName,
      servicePriceCents: args.servicePriceCents,
      serviceDurationMinutes: args.serviceDurationMinutes,
      status: 'waiting',
      tokenNumber: token,
      createdAt: new Date().toISOString(),
      queuePositionAhead: ahead,
      etaMinutes: eta,
    };
    _bookings.unshift(booking);
    return booking;
  },

  async list(): Promise<BookingDto[]> {
    return [..._bookings];
  },

  async get(id: string): Promise<BookingDto | null> {
    return _bookings.find((b) => b.id === id) ?? null;
  },

  async cancel(id: string): Promise<BookingDto | null> {
    const booking = _bookings.find((b) => b.id === id);
    if (!booking) return null;
    booking.status = 'cancelled';
    return { ...booking };
  },

  /** Simulates queue advancement (called by useQueueStatus polling). */
  advanceQueue(id: string): BookingDto | null {
    const booking = _bookings.find((b) => b.id === id);
    if (!booking || booking.status !== 'waiting') return null;
    const ahead = Math.max(0, (booking.queuePositionAhead ?? 1) - 1);
    booking.queuePositionAhead = ahead;
    booking.etaMinutes = ahead > 0 ? Math.round(ahead * (booking.serviceDurationMinutes / 2)) : 0;
    if (ahead === 0) booking.status = 'serving';
    return { ...booking };
  },

  updateStatus(id: string, status: BookingStatus): BookingDto | null {
    const booking = _bookings.find((b) => b.id === id);
    if (!booking) return null;
    booking.status = status;
    return { ...booking };
  },
};
