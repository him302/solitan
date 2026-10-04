import type {
  LiveQueueInfo,
  Location,
  PublicSalonDto,
  RatingSummary,
  ServiceDto,
  SalonStatus,
} from '@soliton/api-contract';
import { CURRENCY } from '@soliton/api-contract';
import type { OpenState } from '@soliton/api-contract';

/** Phase 1 has no queue engine. This is the single honest "no live queue" value. */
export const NO_LIVE_QUEUE: LiveQueueInfo = { available: false };

export interface ServiceRecord {
  id: string;
  salonId: string;
  name: string;
  priceCents: number;
  estimatedMinutes: number;
  active: boolean;
}

export function toServiceDto(service: ServiceRecord): ServiceDto {
  return {
    id: service.id,
    salonId: service.salonId,
    name: service.name,
    priceCents: service.priceCents,
    currency: CURRENCY,
    estimatedMinutes: service.estimatedMinutes,
    active: service.active,
  };
}

export interface SalonRecord {
  id: string;
  name: string;
  photoUrl: string | null;
  address: string | null;
  city: string | null;
  status: string;
}

/**
 * Allow-list projection to the PUBLIC shape. Fields are copied one by one (never spread)
 * so a column added to the table later cannot leak into a public response by accident —
 * ownerId, bufferConfig, queueStatus and timestamps are intentionally absent.
 */
export function toPublicSalon(input: {
  salon: SalonRecord;
  location: Location;
  openState: OpenState;
  rating: RatingSummary | null;
  distanceMeters: number | null;
}): PublicSalonDto {
  const { salon } = input;
  return {
    id: salon.id,
    name: salon.name,
    photoUrl: salon.photoUrl,
    address: salon.address,
    city: salon.city,
    location: input.location,
    status: salon.status as SalonStatus,
    openState: input.openState,
    rating: input.rating,
    distanceMeters: input.distanceMeters === null ? null : Math.round(input.distanceMeters),
    liveQueue: NO_LIVE_QUEUE,
  };
}

/** Average rounded to one decimal; null when there are no reviews (no invented ratings). */
export function toRating(average: number | null, count: number): RatingSummary | null {
  if (count === 0 || average === null) return null;
  return { average: Math.round(average * 10) / 10, count };
}
