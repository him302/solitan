import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueueEntryDto, SalonQueueSnapshot, StaffActionInput } from '@soliton/api-contract';
import { api } from '../api';

export const QUEUE_KEY = 'queue';

export function useSalonQueue(salonId: string | undefined) {
  return useQuery<SalonQueueSnapshot>({
    queryKey: [QUEUE_KEY, salonId],
    queryFn: () => api.queue.snapshot(salonId!),
    enabled: !!salonId,
    staleTime: 2_000,
    refetchInterval: 5_000,
    retry: 1,
  });
}

function useEntryAction(salonId: string | undefined) {
  const queryClient = useQueryClient();
  return {
    invalidate: () => {
      void queryClient.invalidateQueries({ queryKey: [QUEUE_KEY, salonId] });
    },
  };
}

export function useNotifyEntry(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<QueueEntryDto, Error, string>({
    mutationFn: (entryId) => api.queue.notify(entryId),
    onSuccess: invalidate,
  });
}

export function useCheckInEntry(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<QueueEntryDto, Error, string>({
    mutationFn: (entryId) => api.queue.checkIn(entryId),
    onSuccess: invalidate,
  });
}

export function useStartService(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<QueueEntryDto, Error, { entryId: string; input: StaffActionInput }>({
    mutationFn: ({ entryId, input }) => api.queue.startService(entryId, input),
    onSuccess: invalidate,
  });
}

export function useCompleteService(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<QueueEntryDto, Error, string>({
    mutationFn: (entryId) => api.queue.complete(entryId),
    onSuccess: invalidate,
  });
}

export function useMarkNoShow(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<QueueEntryDto, Error, string>({
    mutationFn: (entryId) => api.queue.noShow(entryId),
    onSuccess: invalidate,
  });
}

export function usePauseQueue(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<{ status: string }, Error, void>({
    mutationFn: () => api.queue.pause(salonId!),
    onSuccess: invalidate,
  });
}

export function useResumeQueue(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<{ status: string }, Error, void>({
    mutationFn: () => api.queue.resume(salonId!),
    onSuccess: invalidate,
  });
}

export function useCloseQueue(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<{ status: string }, Error, void>({
    mutationFn: () => api.queue.close(salonId!),
    onSuccess: invalidate,
  });
}
