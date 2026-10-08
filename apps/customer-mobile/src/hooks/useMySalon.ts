import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MySalonDto,
  UpdateSalonInput,
  PutHoursInput,
  OperatingHoursDto,
} from '@soliton/api-contract';
import { api } from '../api';

const MY_SALON_KEY = ['my-salon'];

export function useMySalon() {
  return useQuery<MySalonDto>({
    queryKey: MY_SALON_KEY,
    queryFn: () => api.salons.mine(),
    staleTime: 30_000,
  });
}

export function useUpdateSalon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salonId, input }: { salonId: string; input: UpdateSalonInput }) =>
      api.salons.update(salonId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_SALON_KEY }),
  });
}

export function useSalonHours(salonId: string | undefined) {
  return useQuery<OperatingHoursDto>({
    queryKey: ['salon-hours', salonId],
    queryFn: () => api.salons.hours(salonId!),
    enabled: !!salonId,
    staleTime: 60_000,
  });
}

export function useSalonStaff(salonId: string | undefined) {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['salon-staff', salonId],
    queryFn: () => api.salons.staff(salonId!),
    enabled: !!salonId,
    staleTime: 60_000,
  });
}

export function usePutHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salonId, input }: { salonId: string; input: PutHoursInput }) =>
      api.salons.putHours(salonId, input),
    onSuccess: (_data, { salonId }) => {
      void queryClient.invalidateQueries({ queryKey: ['salon-hours', salonId] });
      void queryClient.invalidateQueries({ queryKey: MY_SALON_KEY });
    },
  });
}
