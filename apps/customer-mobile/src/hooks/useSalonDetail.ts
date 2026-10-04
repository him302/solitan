import { useQuery } from '@tanstack/react-query';
import type { SalonDetailDto, Location } from '@soliton/api-contract';
import { api } from '../api';

export function useSalonDetail(salonId: string, viewerLocation?: Location) {
  return useQuery<SalonDetailDto>({
    queryKey: ['salon', salonId, viewerLocation],
    queryFn: () => api.salons.detail(salonId, viewerLocation),
    enabled: !!salonId,
    staleTime: 60_000,
  });
}
