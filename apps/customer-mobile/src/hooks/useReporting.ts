import { useQuery } from '@tanstack/react-query';
import type {
  AnalyticsDatePreset,
  AppointmentAnalyticsDto,
  CustomerAnalyticsDto,
  PeakHoursDto,
  QueueAnalyticsDto,
  SalonHealthScoreDto,
  SalonOverviewDto,
  ServiceAnalyticsDto,
} from '@soliton/api-contract';
import { api } from '../api';

const STALE_MS = 60_000;

export function useSalonOverview(salonId: string | null, preset: AnalyticsDatePreset = 'today') {
  return useQuery<SalonOverviewDto | null>({
    queryKey: ['salon-overview', salonId, preset],
    queryFn: () => salonId ? api.salonAnalytics.overview(salonId, { preset }) : null,
    enabled: !!salonId,
    staleTime: STALE_MS,
    refetchInterval: 30_000,
  });
}

export function useSalonQueueAnalytics(salonId: string | null, preset: AnalyticsDatePreset = '7d') {
  return useQuery<QueueAnalyticsDto | null>({
    queryKey: ['salon-queue-analytics', salonId, preset],
    queryFn: () => salonId ? api.salonAnalytics.queues(salonId, { preset }) : null,
    enabled: !!salonId,
    staleTime: STALE_MS,
  });
}

export function useSalonAppointmentAnalytics(
  salonId: string | null,
  preset: AnalyticsDatePreset = '7d',
) {
  return useQuery<AppointmentAnalyticsDto | null>({
    queryKey: ['salon-appt-analytics', salonId, preset],
    queryFn: () => salonId ? api.salonAnalytics.appointments(salonId, { preset }) : null,
    enabled: !!salonId,
    staleTime: STALE_MS,
  });
}

export function useSalonServiceAnalytics(
  salonId: string | null,
  preset: AnalyticsDatePreset = '30d',
) {
  return useQuery<ServiceAnalyticsDto | null>({
    queryKey: ['salon-service-analytics', salonId, preset],
    queryFn: () => salonId ? api.salonAnalytics.services(salonId, { preset }) : null,
    enabled: !!salonId,
    staleTime: STALE_MS,
  });
}

export function useSalonCustomerAnalytics(
  salonId: string | null,
  preset: AnalyticsDatePreset = '30d',
) {
  return useQuery<CustomerAnalyticsDto | null>({
    queryKey: ['salon-customer-analytics', salonId, preset],
    queryFn: () => salonId ? api.salonAnalytics.customers(salonId, { preset }) : null,
    enabled: !!salonId,
    staleTime: STALE_MS,
  });
}

export function useSalonPeakHours(salonId: string | null, preset: AnalyticsDatePreset = '30d') {
  return useQuery<PeakHoursDto | null>({
    queryKey: ['salon-peak-hours', salonId, preset],
    queryFn: () => salonId ? api.salonAnalytics.peakHours(salonId, { preset }) : null,
    enabled: !!salonId,
    staleTime: 5 * STALE_MS,
  });
}

export function useSalonHealthScore(salonId: string | null) {
  return useQuery<SalonHealthScoreDto | null>({
    queryKey: ['salon-health', salonId],
    queryFn: () => salonId ? api.salonAnalytics.health(salonId) : null,
    enabled: !!salonId,
    staleTime: 5 * STALE_MS,
  });
}
