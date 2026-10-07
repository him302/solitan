import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateReviewInput, ReviewDto, UpdateReviewInput } from '@soliton/api-contract';
import { api } from '../api';

export const REVIEWS_KEY = 'reviews';
export const SALON_REVIEWS_KEY = 'salon-reviews';

export function useMyReviews() {
  return useQuery({
    queryKey: [REVIEWS_KEY, 'mine'],
    queryFn: () => api.reviews.listMine(),
    staleTime: 30_000,
  });
}

export function useReviewForAppointment(appointmentId: string | null) {
  return useQuery<ReviewDto | null>({
    queryKey: [REVIEWS_KEY, 'appointment', appointmentId],
    queryFn: () => (appointmentId ? api.reviews.forAppointment(appointmentId) : null),
    enabled: !!appointmentId,
    staleTime: 30_000,
  });
}

export function useSalonReviews(salonId: string | null, cursor?: string) {
  return useQuery({
    queryKey: [SALON_REVIEWS_KEY, salonId, cursor],
    queryFn: () =>
      salonId ? api.reviews.listForSalon(salonId, cursor) : { items: [], nextCursor: null },
    enabled: !!salonId,
    staleTime: 60_000,
  });
}

export function useSalonRating(salonId: string | null) {
  return useQuery({
    queryKey: ['salon-rating', salonId],
    queryFn: () => salonId ? api.reviews.ratingForSalon(salonId) : null,
    enabled: !!salonId,
    staleTime: 60_000,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => api.reviews.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [REVIEWS_KEY] });
      qc.invalidateQueries({ queryKey: [SALON_REVIEWS_KEY] });
    },
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReviewInput }) =>
      api.reviews.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [REVIEWS_KEY] }),
  });
}
