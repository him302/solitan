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
  Location,
  MapMarkersResponse,
  MySalonDto,
  OperatingHoursDto,
  PutHoursInput,
  QueueStateDto,
  SalonDetailDto,
  ServiceDto,
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
    },
  };
}

export type SolitonApi = ReturnType<typeof createSolitonApi>;
