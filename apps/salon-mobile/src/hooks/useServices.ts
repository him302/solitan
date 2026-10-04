import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ServiceDto, CreateServiceInput, UpdateServiceInput } from '@soliton/api-contract';
import { api } from '../api';

const servicesKey = (salonId: string) => ['services', salonId];

export function useSalonServices(salonId: string | undefined) {
  return useQuery<ServiceDto[]>({
    queryKey: servicesKey(salonId!),
    queryFn: () => api.services.list(salonId!),
    enabled: !!salonId,
    staleTime: 30_000,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salonId, input }: { salonId: string; input: CreateServiceInput }) =>
      api.services.create(salonId, input),
    onSuccess: (_data, { salonId }) =>
      queryClient.invalidateQueries({ queryKey: servicesKey(salonId) }),
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      salonId,
      serviceId,
      input,
    }: {
      salonId: string;
      serviceId: string;
      input: UpdateServiceInput;
    }) => api.services.update(salonId, serviceId, input),
    onSuccess: (_data, { salonId }) =>
      queryClient.invalidateQueries({ queryKey: servicesKey(salonId) }),
  });
}

export function useDeactivateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ salonId, serviceId }: { salonId: string; serviceId: string }) =>
      api.services.deactivate(salonId, serviceId),
    onSuccess: (_data, { salonId }) =>
      queryClient.invalidateQueries({ queryKey: servicesKey(salonId) }),
  });
}
