import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnnouncementInput,
  ChangeServiceInput,
  LateReportInput,
  LateResponseInput,
  NoShowPolicyInput,
  QueueEntryDto,
  SalonAnnouncementDto,
  SalonQueueSnapshot,
  SetCapacityInput,
  StaffActionInput,
  StaffEntryRow,
} from '@soliton/api-contract';
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

export function useOpenQueue(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<{ status: string }, Error, void>({
    mutationFn: () => api.queue.open(salonId!),
    onSuccess: invalidate,
  });
}

export function useLimitQueue(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<{ status: string }, Error, void>({
    mutationFn: () => api.queue.limit(salonId!),
    onSuccess: invalidate,
  });
}

export function useUndoComplete(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<QueueEntryDto, Error, string>({
    mutationFn: (entryId) => api.queue.undoComplete(entryId),
    onSuccess: invalidate,
  });
}

export function useAnnouncements(salonId: string | undefined) {
  return useQuery<SalonAnnouncementDto[]>({
    queryKey: ['announcements', salonId],
    queryFn: () => api.queue.announcements(salonId!),
    enabled: !!salonId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function usePostAnnouncement(salonId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<SalonAnnouncementDto, Error, AnnouncementInput>({
    mutationFn: (input) => api.queue.announce(salonId!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements', salonId] });
    },
  });
}

export function useQueueSearch(salonId: string | undefined) {
  return useMutation<StaffEntryRow[], Error, string>({
    mutationFn: (q) => api.queue.search(salonId!, q),
  });
}

export function useChangeService() {
  return useMutation<QueueEntryDto, Error, { entryId: string; input: ChangeServiceInput }>({
    mutationFn: ({ entryId, input }) => api.queue.changeService(entryId, input),
  });
}

export function useReportLate() {
  return useMutation<QueueEntryDto, Error, { entryId: string; input: LateReportInput }>({
    mutationFn: ({ entryId, input }) => api.queue.reportLate(entryId, input),
  });
}

export function useRespondLate(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<QueueEntryDto, Error, { entryId: string; input: LateResponseInput }>({
    mutationFn: ({ entryId, input }) => api.queue.respondLate(entryId, input),
    onSuccess: invalidate,
  });
}

export function useMarkArrived() {
  return useMutation<QueueEntryDto, Error, string>({
    mutationFn: (entryId) => api.queue.arrive(entryId),
  });
}

export function useSetCapacity(salonId: string | undefined) {
  const { invalidate } = useEntryAction(salonId);
  return useMutation<{ maxCapacity: number | null }, Error, SetCapacityInput>({
    mutationFn: (input) => api.queue.setCapacity(salonId!, input),
    onSuccess: invalidate,
  });
}

export function useSetNoShowPolicy(salonId: string | undefined) {
  return useMutation<{ policy: string; threshold: number }, Error, NoShowPolicyInput>({
    mutationFn: (input) => api.queue.setNoShowPolicy(salonId!, input),
  });
}
