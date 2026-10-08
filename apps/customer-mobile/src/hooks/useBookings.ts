import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueueEntryDto } from '@soliton/api-contract';
import { api } from '../api';

export const BOOKINGS_KEY = 'bookings';

/** List all customer bookings (active + past). */
export function useBookings() {
  return useQuery<QueueEntryDto[]>({
    queryKey: [BOOKINGS_KEY],
    queryFn: () => api.bookings.list(),
    staleTime: 5_000,
    retry: 1,
  });
}

/** Single booking detail — polls every 8 seconds as Socket.IO fallback. */
export function useBooking(id: string | null) {
  return useQuery<QueueEntryDto | null>({
    queryKey: [BOOKINGS_KEY, id],
    queryFn: () => (id ? api.bookings.get(id) : null),
    enabled: !!id,
    staleTime: 3_000,
    refetchInterval: 8_000,
    retry: 1,
  });
}

export interface CreateBookingArgs {
  salonId: string;
  serviceId: string;
  idempotencyKey?: string;
  preferredStaffId?: string;
}

/** Join queue (replaces Phase 2 mock booking creation). */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation<QueueEntryDto, Error, CreateBookingArgs>({
    mutationFn: ({ salonId, serviceId, idempotencyKey, preferredStaffId }) =>
      api.queue.join({ salonId, serviceId, preferredStaffId }, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
    },
  });
}

/** Cancel / leave queue. */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation<QueueEntryDto, Error, string>({
    mutationFn: (id) => api.queue.leave(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
    },
  });
}
