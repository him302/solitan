import { create } from 'zustand';

/** Transient UI state for the in-progress booking flow. */
interface BookingFlowState {
  salonId: string | null;
  salonName: string | null;
  salonAddress: string | null;
  serviceId: string | null;
  serviceName: string | null;
  servicePriceCents: number | null;
  serviceDurationMinutes: number | null;

  setSelectedService: (args: {
    salonId: string;
    salonName: string;
    salonAddress: string | null;
    serviceId: string;
    serviceName: string;
    servicePriceCents: number;
    serviceDurationMinutes: number;
  }) => void;
  clearSelection: () => void;
}

export const useBookingStore = create<BookingFlowState>((set) => ({
  salonId: null,
  salonName: null,
  salonAddress: null,
  serviceId: null,
  serviceName: null,
  servicePriceCents: null,
  serviceDurationMinutes: null,

  setSelectedService: (args) =>
    set({
      salonId: args.salonId,
      salonName: args.salonName,
      salonAddress: args.salonAddress,
      serviceId: args.serviceId,
      serviceName: args.serviceName,
      servicePriceCents: args.servicePriceCents,
      serviceDurationMinutes: args.serviceDurationMinutes,
    }),

  clearSelection: () =>
    set({
      salonId: null,
      salonName: null,
      salonAddress: null,
      serviceId: null,
      serviceName: null,
      servicePriceCents: null,
      serviceDurationMinutes: null,
    }),
}));
