import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AppointmentDto,
  AppointmentSummaryDto,
  AvailabilitySlot,
  CreateAppointmentInput,
} from '@soliton/api-contract';
import { api } from '../api';

export const APPOINTMENTS_KEY = 'appointments';
export const AVAILABILITY_KEY = 'availability';

/** List all customer appointments. */
export function useAppointments() {
  return useQuery<AppointmentSummaryDto[]>({
    queryKey: [APPOINTMENTS_KEY],
    queryFn: () => api.appointments.list(),
    staleTime: 10_000,
    retry: 1,
  });
}

/** Single appointment detail. */
export function useAppointment(id: string | null) {
  return useQuery<AppointmentDto | null>({
    queryKey: [APPOINTMENTS_KEY, id],
    queryFn: () => (id ? api.appointments.get(id) : null),
    enabled: !!id,
    staleTime: 5_000,
    retry: 1,
  });
}

/** Available slots for a salon/service/date. */
export function useAvailability(salonId: string | null, serviceId: string | null, date: string | null) {
  return useQuery<AvailabilitySlot[]>({
    queryKey: [AVAILABILITY_KEY, salonId, serviceId, date],
    queryFn: () => api.appointments.availability(salonId!, serviceId!, date!),
    enabled: !!(salonId && serviceId && date),
    staleTime: 30_000,
    retry: 1,
  });
}

/** Book an appointment. */
export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation<AppointmentDto, Error, CreateAppointmentInput>({
    mutationFn: (input) => api.appointments.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_KEY] });
      void queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
    },
  });
}

/** Cancel an appointment. */
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation<AppointmentDto, Error, string>({
    mutationFn: (id) => api.appointments.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_KEY] });
    },
  });
}

/** Tap "I'm On My Way". */
export function useOnWay() {
  const queryClient = useQueryClient();
  return useMutation<AppointmentDto, Error, string>({
    mutationFn: (id) => api.appointments.onWay(id),
    onSuccess: (data) => {
      queryClient.setQueryData<AppointmentDto>([APPOINTMENTS_KEY, data.id], data);
      void queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_KEY] });
    },
  });
}

/** Check in — transitions appointment to queue. */
export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation<AppointmentDto, Error, string>({
    mutationFn: (id) => api.appointments.checkIn(id),
    onSuccess: (data) => {
      queryClient.setQueryData<AppointmentDto>([APPOINTMENTS_KEY, data.id], data);
      void queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_KEY] });
    },
  });
}
