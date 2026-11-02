import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AddStaffInput,
  SetStaffServicesInput,
  StaffListDto,
  StaffMemberDto,
  UpdateStaffInput,
} from '@soliton/api-contract';
import { api } from '../api';
import { QUEUE_KEY } from './useQueue';

const staffKey = (salonId: string) => ['staff', salonId];

/**
 * Owner-facing roster. The public name-only list lives in `useSalonStaff`
 * (useMySalon.ts); this one carries capabilities and live workload, so it is owner-only
 * on the server and must not be used on customer screens.
 */
export function useStaffRoster(salonId: string | undefined) {
  return useQuery<StaffListDto>({
    queryKey: staffKey(salonId!),
    queryFn: () => api.staff.list(salonId!),
    enabled: !!salonId,
    // Workload (who is serving whom) changes as the queue moves, so this is kept short.
    staleTime: 10_000,
  });
}

export function useAddStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salonId, input }: { salonId: string; input: AddStaffInput }) =>
      api.staff.add(salonId, input),
    onSuccess: (_data, { salonId }) => invalidateRoster(queryClient, salonId),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      salonId,
      staffId,
      input,
    }: {
      salonId: string;
      staffId: string;
      input: UpdateStaffInput;
    }) => api.staff.update(salonId, staffId, input),
    onSuccess: (_data, { salonId }) => invalidateRoster(queryClient, salonId),
  });
}

export function useSetStaffServices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      salonId,
      staffId,
      input,
    }: {
      salonId: string;
      staffId: string;
      input: SetStaffServicesInput;
    }) => api.staff.setServices(salonId, staffId, input),
    onSuccess: (_data, { salonId }) => invalidateRoster(queryClient, salonId),
  });
}

export function useRemoveStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salonId, staffId }: { salonId: string; staffId: string }) =>
      api.staff.remove(salonId, staffId),
    onSuccess: (_data, { salonId }) => invalidateRoster(queryClient, salonId),
  });
}

/** A staff member clocking themselves on or off. Scoped to the signed-in user. */
export function useSetOwnShift() {
  const queryClient = useQueryClient();
  return useMutation<StaffMemberDto, Error, boolean>({
    mutationFn: (onShift: boolean) => api.staff.setOwnShift(onShift),
    onSuccess: (member) => {
      void queryClient.invalidateQueries({ queryKey: staffKey(member.salonId) });
      void queryClient.invalidateQueries({ queryKey: ['my-salon'] });
    },
  });
}

/**
 * Staff changes move the ETA engine's capacity input, so the queue snapshot is refreshed
 * alongside the roster — otherwise waiting times on screen would lag behind the change
 * that caused them.
 */
function invalidateRoster(
  queryClient: ReturnType<typeof useQueryClient>,
  salonId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: staffKey(salonId) });
  void queryClient.invalidateQueries({ queryKey: ['salon-staff', salonId] });
  void queryClient.invalidateQueries({ queryKey: [QUEUE_KEY, salonId] });
}
