/**
 * @soliton/api-client — typed access to the Soliton API, built on the shared
 * @soliton/api-contract types. No UI, no storage implementation (callers inject a
 * TokenStore), and no React: usable from both mobile apps and the admin web.
 */
import type {
  AdminSalonListDto,
  AdminSalonListQuery,
  AdminUpdateSalonStatusInput,
  AnalyticsQuery,
  AnnouncementInput,
  AppointmentAnalyticsDto,
  AppointmentDto,
  AppointmentSummaryDto,
  AvailabilitySlot,
  AuthTokens,
  ChangeServiceInput,
  ComplaintDto,
  CreateAppointmentInput,
  CreateBookingInput,
  CreateComplaintInput,
  CreateMockPaymentInput,
  CreateReviewInput,
  CreateSalonInput,
  CreateServiceInput,
  CurrentUser,
  CustomerAnalyticsDto,
  DiscoveryPage,
  DiscoverySort,
  GeocodeResponse,
  JoinQueueInput,
  LateReportInput,
  LateResponseInput,
  ListSalonAppointmentsInput,
  Location,
  MapMarkersResponse,
  MockPaymentActionInput,
  MySalonDto,
  OperatingHoursDto,
  PaymentDto,
  PeakHoursDto,
  PlatformOverviewDto,
  PutHoursInput,
  QueueAnalyticsDto,
  QueueEntryDto,
  QueueStateDto,
  ReviewDto,
  SalonAnnouncementDto,
  SalonHealthScoreDto,
  SalonOverviewDto,
  SalonQueueSnapshot,
  SalonDetailDto,
  SalonRatingSummary,
  ServiceAnalyticsDto,
  ServiceDto,
  StaffActionInput,
  StaffEntryRow,
  UpdateReviewInput,
  UpdateSalonInput,
  UpdateServiceInput,
} from '@soliton/api-contract';
import { HttpClient, type HttpClientConfig } from './http';

export {
  ApiError,
  HttpClient,
  buildQueryString,
  type FetchLike,
  type HttpClientConfig,
  type TokenStore,
} from './http';

export interface DiscoveryParams {
  q?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: DiscoverySort;
  limit?: number;
  offset?: number;
}

export interface MapParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}

export function createSolitonApi(config: HttpClientConfig) {
  const http = new HttpClient(config);
  const viewerQuery = (location?: Location) =>
    location ? { lat: location.latitude, lng: location.longitude } : undefined;

  return {
    auth: {
      /** Staff / owner / admin sign-in. Stores the session via the injected TokenStore. */
      async login(email: string, password: string): Promise<AuthTokens> {
        const tokens = await http.post<AuthTokens>('/auth/login', { email, password });
        await config.tokens?.setTokens(tokens.accessToken, tokens.refreshToken);
        return tokens;
      },
      me: () => http.get<CurrentUser>('/auth/me'),
      async logout(): Promise<void> {
        const refreshToken = await config.tokens?.getRefreshToken();
        try {
          if (refreshToken) await http.post('/auth/logout', { refreshToken });
        } finally {
          await config.tokens?.clear();
        }
      },
    },
    discovery: {
      search: (params: DiscoveryParams) => http.get<DiscoveryPage>('/discovery/salons', params),
      map: (params: MapParams) => http.get<MapMarkersResponse>('/discovery/map', params),
    },
    salons: {
      detail: (id: string, viewer?: Location) =>
        http.get<SalonDetailDto>(`/salons/${id}`, viewerQuery(viewer)),
      hours: (id: string) => http.get<OperatingHoursDto>(`/salons/${id}/hours`),
      staff: (id: string) => http.get<{ id: string; name: string }[]>(`/salons/${id}/staff`),
      mine: () => http.get<MySalonDto>('/me/salon'),
      create: (input: CreateSalonInput) => http.post<MySalonDto>('/salons', input),
      update: (id: string, input: UpdateSalonInput) =>
        http.patch<MySalonDto>(`/salons/${id}`, input),
      putHours: (id: string, input: PutHoursInput) =>
        http.put<OperatingHoursDto>(`/salons/${id}/hours`, input),
    },
    services: {
      list: (salonId: string) => http.get<ServiceDto[]>(`/salons/${salonId}/services`),
      create: (salonId: string, input: CreateServiceInput) =>
        http.post<ServiceDto>(`/salons/${salonId}/services`, input),
      update: (salonId: string, serviceId: string, input: UpdateServiceInput) =>
        http.patch<ServiceDto>(`/salons/${salonId}/services/${serviceId}`, input),
      deactivate: (salonId: string, serviceId: string) =>
        http.delete<ServiceDto>(`/salons/${salonId}/services/${serviceId}`),
    },
    maps: {
      geocode: (address: string) => http.get<GeocodeResponse>('/maps/geocode', { address }),
    },
    bookings: {
      create: (input: CreateBookingInput) => http.post<QueueEntryDto>('/bookings', input),
      list: () => http.get<QueueEntryDto[]>('/me/bookings'),
      get: (id: string) => http.get<QueueEntryDto>(`/bookings/${id}`),
      cancel: (id: string) => http.delete<QueueEntryDto>(`/bookings/${id}`),
    },
    queue: {
      status: (salonId: string) => http.get<QueueStateDto>(`/salons/${salonId}/queue`),
      /** Customer: join a salon's queue. Pass Idempotency-Key header via extraHeaders. */
      join: (input: JoinQueueInput, idempotencyKey?: string) =>
        http.post<QueueEntryDto>('/queue/join', input, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined),
      /** Customer: leave the queue (cancel own entry). */
      leave: (entryId: string) => http.delete<QueueEntryDto>(`/queue/entries/${entryId}`),
      /** Staff: get live queue snapshot for their salon. */
      snapshot: (salonId: string) => http.get<SalonQueueSnapshot>(`/queue/${salonId}/snapshot`),
      /** Staff: notify a customer (state: waiting → notified). */
      notify: (entryId: string) => http.post<QueueEntryDto>(`/queue/entries/${entryId}/notify`, {}),
      /** Staff/Customer: check in (state: notified → checked_in). */
      checkIn: (entryId: string) => http.post<QueueEntryDto>(`/queue/entries/${entryId}/checkin`, {}),
      /** Customer/Staff: mark physical arrival at salon. */
      arrive: (entryId: string) => http.post<QueueEntryDto>(`/queue/entries/${entryId}/arrive`, {}),
      /** Customer: report running late. */
      reportLate: (entryId: string, input: LateReportInput) =>
        http.post<QueueEntryDto>(`/queue/entries/${entryId}/late`, input),
      /** Staff: respond to a late report. */
      respondLate: (entryId: string, input: LateResponseInput) =>
        http.post<QueueEntryDto>(`/queue/entries/${entryId}/late-response`, input),
      /** Customer/Staff: change service on active entry. */
      changeService: (entryId: string, input: ChangeServiceInput) =>
        http.patch<QueueEntryDto>(`/queue/entries/${entryId}/service`, input),
      /** Staff: start service (state: checked_in → in_service). */
      startService: (entryId: string, input: StaffActionInput) =>
        http.post<QueueEntryDto>(`/queue/entries/${entryId}/start`, input),
      /** Staff: complete service (state: in_service → completed). */
      complete: (entryId: string) => http.post<QueueEntryDto>(`/queue/entries/${entryId}/complete`, {}),
      /** Staff: undo a recent completion. */
      undoComplete: (entryId: string) => http.post<QueueEntryDto>(`/queue/entries/${entryId}/undo-complete`, {}),
      /** Staff: mark no-show. */
      noShow: (entryId: string) => http.post<QueueEntryDto>(`/queue/entries/${entryId}/noshow`, {}),
      /** Staff: pause queue. */
      pause: (salonId: string) => http.post<{ status: string }>(`/queue/${salonId}/pause`, {}),
      /** Staff: resume queue. */
      resume: (salonId: string) => http.post<{ status: string }>(`/queue/${salonId}/resume`, {}),
      /** Staff: close queue. */
      close: (salonId: string) => http.post<{ status: string }>(`/queue/${salonId}/close`, {}),
      /** Staff: open queue (from any state). */
      open: (salonId: string) => http.post<{ status: string }>(`/queue/${salonId}/open`, {}),
      /** Staff: set queue to limited mode (no new joins). */
      limit: (salonId: string) => http.post<{ status: string }>(`/queue/${salonId}/limited`, {}),
      /** Anyone: list recent salon announcements. */
      announcements: (salonId: string) => http.get<SalonAnnouncementDto[]>(`/queue/${salonId}/announcements`),
      /** Staff: post an announcement. */
      announce: (salonId: string, input: AnnouncementInput) =>
        http.post<SalonAnnouncementDto>(`/queue/${salonId}/announcements`, input),
      /** Staff: search queue entries. */
      search: (salonId: string, q: string) =>
        http.get<StaffEntryRow[]>(`/queue/${salonId}/search`, { q }),
    },
    appointments: {
      /** Customer: list own appointments. */
      list: () => http.get<AppointmentSummaryDto[]>('/me/appointments'),
      /** Customer or staff: get appointment detail. */
      get: (id: string) => http.get<AppointmentDto>(`/appointments/${id}`),
      /** Customer: book an appointment. */
      create: (input: CreateAppointmentInput) => http.post<AppointmentDto>('/appointments', input),
      /** Customer: cancel own appointment. */
      cancel: (id: string) => http.patch<AppointmentDto>(`/appointments/${id}/cancel`, {}),
      /** Customer: tap "I'm On My Way". */
      onWay: (id: string) => http.post<AppointmentDto>(`/appointments/${id}/on-way`, {}),
      /** Customer: check in → transitions to queue. */
      checkIn: (id: string) => http.post<AppointmentDto>(`/appointments/${id}/check-in`, {}),
      /** Salon staff/owner: list appointments for a salon on a given date. */
      listForSalon: (salonId: string, params?: ListSalonAppointmentsInput) =>
        http.get<AppointmentSummaryDto[]>(`/salons/${salonId}/appointments`, params),
      /** Salon staff/owner: mark appointment as no-show. */
      noShow: (id: string) => http.post<AppointmentDto>(`/appointments/${id}/no-show`, {}),
      /** Salon staff/owner: start service for checked-in appointment. */
      start: (id: string) => http.post<AppointmentDto>(`/appointments/${id}/start`, {}),
      /** Salon staff/owner: complete appointment service. */
      complete: (id: string) => http.post<AppointmentDto>(`/appointments/${id}/complete`, {}),
      /** Get available slots for a salon/service/date. */
      availability: (salonId: string, serviceId: string, date: string) =>
        http.get<AvailabilitySlot[]>(`/salons/${salonId}/availability`, { serviceId, date }),
    },
    reviews: {
      /** Customer: submit a review for a completed appointment. */
      create: (input: CreateReviewInput) => http.post<ReviewDto>('/reviews', input),
      /** Customer: update own review within 24h window. */
      update: (id: string, input: UpdateReviewInput) => http.patch<ReviewDto>(`/reviews/${id}`, input),
      /** Get a single review. */
      get: (id: string) => http.get<ReviewDto>(`/reviews/${id}`),
      /** Customer: list own reviews. */
      listMine: (cursor?: string, limit?: number) =>
        http.get<{ items: ReviewDto[]; nextCursor: string | null }>('/me/reviews', { cursor, limit }),
      /** Customer: check if appointment already has a review. */
      forAppointment: (appointmentId: string) =>
        http.get<ReviewDto | null>(`/me/reviews/appointment/${appointmentId}`),
      /** Public: list published reviews for a salon. */
      listForSalon: (salonId: string, cursor?: string, limit?: number) =>
        http.get<{ items: ReviewDto[]; nextCursor: string | null }>(`/salons/${salonId}/reviews`, { cursor, limit }),
      /** Public: get salon rating summary. */
      ratingForSalon: (salonId: string) => http.get<SalonRatingSummary>(`/salons/${salonId}/rating`),
      /** Salon owner: list all reviews for own salon. */
      listForSalonOwner: (cursor?: string, limit?: number, status?: string) =>
        http.get<{ items: ReviewDto[]; nextCursor: string | null }>('/salon/reviews', { cursor, limit, status }),
    },
    complaints: {
      create: (input: CreateComplaintInput) => http.post<ComplaintDto>('/complaints', input),
      listMine: (cursor?: string, limit?: number) =>
        http.get<{ items: ComplaintDto[]; nextCursor: string | null }>('/me/complaints', { cursor, limit }),
      getOne: (id: string) => http.get<ComplaintDto>(`/me/complaints/${id}`),
    },
    payments: {
      /** DEVELOPMENT ONLY: create a pending mock payment. */
      mockCreate: (input: CreateMockPaymentInput) => http.post<PaymentDto>('/payments/mock/create', input),
      /** DEVELOPMENT ONLY: simulate success. */
      mockSucceed: (input: MockPaymentActionInput) => http.post<PaymentDto>('/payments/mock/succeed', input),
      /** DEVELOPMENT ONLY: simulate failure. */
      mockFail: (input: MockPaymentActionInput) => http.post<PaymentDto>('/payments/mock/fail', input),
      /** Refund a payment. */
      refund: (input: MockPaymentActionInput) => http.post<PaymentDto>('/payments/mock/refund', input),
      listMine: (cursor?: string, limit?: number) =>
        http.get<{ items: PaymentDto[]; nextCursor: string | null }>('/me/payments', { cursor, limit }),
    },
    admin: {
      listReviews: (cursor?: string, limit?: number, status?: string) =>
        http.get<{ items: ReviewDto[]; nextCursor: string | null }>('/admin/reviews', { cursor, limit, status }),
      moderateReview: (id: string, input: { status: string; adminNote?: string }) =>
        http.patch<ReviewDto>(`/admin/reviews/${id}/moderation`, input),
      listComplaints: (cursor?: string, limit?: number, status?: string) =>
        http.get<{ items: ComplaintDto[]; nextCursor: string | null }>('/admin/complaints', { cursor, limit, status }),
      updateComplaint: (id: string, input: { status: string; adminNote?: string }) =>
        http.patch<ComplaintDto>(`/admin/complaints/${id}`, input),
      listPayments: (cursor?: string, limit?: number, status?: string) =>
        http.get<{ items: PaymentDto[]; nextCursor: string | null }>('/admin/payments', { cursor, limit, status }),
      // Phase 6 analytics
      analyticsOverview: (q?: AnalyticsQuery) =>
        http.get<PlatformOverviewDto>('/admin/analytics/overview', q),
      analyticsQueues: (q?: AnalyticsQuery) =>
        http.get<QueueAnalyticsDto>('/admin/analytics/queues', q),
      analyticsAppointments: (q?: AnalyticsQuery) =>
        http.get<AppointmentAnalyticsDto>('/admin/analytics/appointments', q),
      // Salon directory
      listSalons: (q: AdminSalonListQuery) =>
        http.get<AdminSalonListDto>('/admin/salons', q as Record<string, unknown>),
      updateSalonStatus: (id: string, input: AdminUpdateSalonStatusInput) =>
        http.patch<void>(`/admin/salons/${id}/status`, input),
    },
    // Phase 6 salon analytics (owner/staff)
    salonAnalytics: {
      overview: (salonId: string, q?: AnalyticsQuery) =>
        http.get<SalonOverviewDto>(`/salons/${salonId}/analytics/overview`, q),
      queues: (salonId: string, q?: AnalyticsQuery) =>
        http.get<QueueAnalyticsDto>(`/salons/${salonId}/analytics/queues`, q),
      appointments: (salonId: string, q?: AnalyticsQuery) =>
        http.get<AppointmentAnalyticsDto>(`/salons/${salonId}/analytics/appointments`, q),
      services: (salonId: string, q?: AnalyticsQuery) =>
        http.get<ServiceAnalyticsDto>(`/salons/${salonId}/analytics/services`, q),
      customers: (salonId: string, q?: AnalyticsQuery) =>
        http.get<CustomerAnalyticsDto>(`/salons/${salonId}/analytics/customers`, q),
      peakHours: (salonId: string, q?: AnalyticsQuery) =>
        http.get<PeakHoursDto>(`/salons/${salonId}/analytics/peak-hours`, q),
      health: (salonId: string) =>
        http.get<SalonHealthScoreDto>(`/salons/${salonId}/analytics/health`),
    },
  };
}

export type SolitonApi = ReturnType<typeof createSolitonApi>;
