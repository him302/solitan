import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DiscoveryPage, DiscoverySort } from '@soliton/api-contract';
import { api } from '../api';

export interface DiscoveryFilters {
  q?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: DiscoverySort;
  limit?: number;
  offset?: number;
}

const DISCOVERY_KEY = 'discovery';

export function useDiscovery(filters: DiscoveryFilters) {
  return useQuery<DiscoveryPage>({
    queryKey: [DISCOVERY_KEY, filters],
    queryFn: () => api.discovery.search(filters),
    staleTime: 30_000,
  });
}

export function usePrefetchNextPage(filters: DiscoveryFilters, nextOffset: number | null) {
  const queryClient = useQueryClient();
  if (nextOffset === null) return;
  const nextFilters = { ...filters, offset: nextOffset };
  void queryClient.prefetchQuery({
    queryKey: [DISCOVERY_KEY, nextFilters],
    queryFn: () => api.discovery.search(nextFilters),
    staleTime: 30_000,
  });
}
