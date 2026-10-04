/**
 * @soliton/api-client — typed access to the Soliton API, built on the shared
 * @soliton/api-contract types. No UI, no storage implementation (callers inject a
 * TokenStore), and no React: usable from both mobile apps and the admin web.
 */
import type {
  AuthTokens,
  BookingDto,
  CreateBookingInput,
  CreateSalonInput,
  CreateServiceInput,
  CurrentUser,
  DiscoveryPage,
  DiscoverySort,
  GeocodeResponse,
  JoinQueueInput,
  Location,
  MapMarkersResponse,
  MySalonDto,
  OperatingHoursDto,
  PutHoursInput,
  QueueEntryDto,
  QueueStateDto,
  SalonQueueSnapshot,
  SalonDetailDto,
  ServiceDto,
  StaffActionInput,
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
      create: (input: CreateBookingInput) => http.post<BookingDto>('/bookings', input),
      list: () => http.get<BookingDto[]>('/me/bookings'),
      get: (id: string) => http.get<BookingDto>(`/bookings/${id}`),
      cancel: (id: string) => http.delete<BookingDto>(`/bookings/${id}`),
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
      /** Staff: start service (state: checked_in → in_service). */
      startService: (entryId: string, input: StaffActionInput) =>
        http.post<QueueEntryDto>(`/queue/entries/${entryId}/start`, input),
      /** Staff: complete service (state: in_service → completed). */
      complete: (entryId: string) => http.post<QueueEntryDto>(`/queue/entries/${entryId}/complete`, {}),
      /** Staff: mark no-show. */
      noShow: (entryId: string) => http.post<QueueEntryDto>(`/queue/entries/${entryId}/noshow`, {}),
      /** Staff: pause queue. */
      pause: (salonId: string) => http.post<{ status: string }>(`/queue/${salonId}/pause`, {}),
      /** Staff: resume queue. */
      resume: (salonId: string) => http.post<{ status: string }>(`/queue/${salonId}/resume`, {}),
      /** Staff: close queue. */
      close: (salonId: string) => http.post<{ status: string }>(`/queue/${salonId}/close`, {}),
    },
  };
}

export type SolitonApi = ReturnType<typeof createSolitonApi>;
