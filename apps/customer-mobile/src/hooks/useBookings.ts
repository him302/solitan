import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BookingDto } from '@soliton/api-contract';
import { bookingRepository, type CreateBookingArgs } from '../services/bookingRepository';

export const BOOKINGS_KEY = 'bookings';

export function useBookings() {
  return useQuery<BookingDto[]>({
    queryKey: [BOOKINGS_KEY],
    queryFn: () => bookingRepository.list(),
    staleTime: 5_000,
  });
}

export function useBooking(id: string | null) {
  return useQuery<BookingDto | null>({
    queryKey: [BOOKINGS_KEY, id],
    queryFn: () => (id ? bookingRepository.get(id) : null),
    enabled: !!id,
    staleTime: 3_000,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation<BookingDto, Error, CreateBookingArgs>({
    mutationFn: (args) => bookingRepository.create(args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation<BookingDto | null, Error, string>({
    mutationFn: (id) => bookingRepository.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
    },
  });
}
