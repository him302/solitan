/**
 * Discovery contracts (Phase 1): simple, bounded, server-side PostgreSQL search.
 * Sorting is user-controlled and deliberately unopinionated — there is no "best" or
 * "recommended" ranking.
 */
import { z } from 'zod';
import type { DiscoverySalonDto, Location, OpenState } from './salon';

export const DISCOVERY_SORTS = ['nearest', 'name'] as const;
export type DiscoverySort = (typeof DISCOVERY_SORTS)[number];

export const DISCOVERY_MAX_LIMIT = 50;
export const DISCOVERY_MAX_OFFSET = 1000;
export const MAP_MAX_LIMIT = 100;

const latSchema = z.coerce.number().min(-90).max(90);
const lngSchema = z.coerce.number().min(-180).max(180);

export const discoveryQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    lat: latSchema.optional(),
    lng: lngSchema.optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
    sort: z.enum(DISCOVERY_SORTS).optional(),
    limit: z.coerce.number().int().min(1).max(DISCOVERY_MAX_LIMIT).default(20),
    offset: z.coerce.number().int().min(0).max(DISCOVERY_MAX_OFFSET).default(0),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.lat === undefined) !== (value.lng === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [value.lat === undefined ? 'lat' : 'lng'],
        message: 'lat and lng must be provided together',
      });
    }
    if (value.radiusKm !== undefined && value.lat === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['radiusKm'],
        message: 'radiusKm requires lat and lng',
      });
    }
  });
export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;

export const mapQuerySchema = z
  .object({
    lat: latSchema,
    lng: lngSchema,
    radiusKm: z.coerce.number().positive().max(50).default(10),
    limit: z.coerce.number().int().min(1).max(MAP_MAX_LIMIT).default(50),
  })
  .strict();
export type MapQuery = z.infer<typeof mapQuerySchema>;

/** Optional viewer coordinates for distance on a single salon. Never persisted. */
export const viewerLocationQuerySchema = z
  .object({ lat: latSchema.optional(), lng: lngSchema.optional() })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.lat === undefined) !== (value.lng === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [value.lat === undefined ? 'lat' : 'lng'],
        message: 'lat and lng must be provided together',
      });
    }
  });
export type ViewerLocationQuery = z.infer<typeof viewerLocationQuerySchema>;

export interface DiscoveryPage {
  items: DiscoverySalonDto[];
  page: { limit: number; offset: number; nextOffset: number | null };
  /** The sort actually applied (nearest falls back to name without coordinates). */
  appliedSort: DiscoverySort;
}

/** Minimal marker payload for the map — bounded and Soliton-connected salons only. */
export interface MapMarkerDto {
  id: string;
  name: string;
  location: Location;
  distanceMeters: number | null;
  openState: OpenState;
}

export interface MapMarkersResponse {
  markers: MapMarkerDto[];
}

// ---------------- analytics seam ----------------

/** Event names reserved for the future analytics pipeline. No personal data attached. */
export const ANALYTICS_EVENTS = [
  'salon_viewed',
  'service_viewed',
  'search_performed',
  'map_opened',
  'directions_opened',
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];
