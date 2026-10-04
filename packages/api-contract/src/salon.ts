/**
 * Salon, operating-hours and service contracts (Phase 1). Zod schemas are the single
 * source of truth for request validation on BOTH the API and the clients, so the two
 * can never drift. All write schemas are `.strict()`: unknown keys (ownerId, status,
 * queueStatus, …) are rejected rather than silently ignored (no mass assignment).
 */
import { z } from 'zod';

export const SALON_TIMEZONE = 'Asia/Kolkata';
export const CURRENCY = 'INR';

export type SalonStatus = 'pending' | 'active' | 'suspended';
export type QueueStatus = 'open' | 'paused' | 'closed';
/** 'unconfigured' = the salon has not set hours; we never pretend it is open. */
export type OpenState = 'open' | 'closed' | 'unconfigured';

// ---------------- domain error codes ----------------

export const DomainErrorCode = {
  SALON_NOT_FOUND: 'SALON_NOT_FOUND',
  SALON_ACCESS_DENIED: 'SALON_ACCESS_DENIED',
  SALON_ALREADY_EXISTS: 'SALON_ALREADY_EXISTS',
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  SERVICE_ACCESS_DENIED: 'SERVICE_ACCESS_DENIED',
  INVALID_LOCATION: 'INVALID_LOCATION',
  INVALID_OPERATING_HOURS: 'INVALID_OPERATING_HOURS',
  INVALID_SERVICE: 'INVALID_SERVICE',
  INVALID_PRICE: 'INVALID_PRICE',
  INVALID_DURATION: 'INVALID_DURATION',
  INVALID_DISCOVERY_QUERY: 'INVALID_DISCOVERY_QUERY',
} as const;
export type DomainErrorCode = (typeof DomainErrorCode)[keyof typeof DomainErrorCode];

// ---------------- location ----------------

export const latitudeSchema = z.number().finite().min(-90).max(90);
export const longitudeSchema = z.number().finite().min(-180).max(180);

export const locationSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});
export type Location = z.infer<typeof locationSchema>;

// ---------------- salon ----------------

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

const photoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), 'photoUrl must be an http(s) URL')
  .refine((value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, 'photoUrl must be a valid URL');

export const bufferConfigSchema = z
  .record(z.string().min(1).max(40), z.union([z.number(), z.string().max(100), z.boolean()]))
  .refine((value) => Object.keys(value).length <= 10, 'bufferConfig has too many keys');
export type BufferConfig = z.infer<typeof bufferConfigSchema>;

export const createSalonSchema = z
  .object({
    name: trimmed(2, 80),
    address: trimmed(3, 200),
    city: trimmed(2, 80),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    photoUrl: photoUrlSchema.optional(),
    bufferConfig: bufferConfigSchema.optional(),
  })
  .strict();
export type CreateSalonInput = z.infer<typeof createSalonSchema>;

export const updateSalonSchema = z
  .object({
    name: trimmed(2, 80).optional(),
    address: trimmed(3, 200).optional(),
    city: trimmed(2, 80).optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    photoUrl: photoUrlSchema.nullable().optional(),
    bufferConfig: bufferConfigSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasLat = value.latitude !== undefined;
    const hasLng = value.longitude !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [hasLat ? 'longitude' : 'latitude'],
        message: 'latitude and longitude must be provided together',
      });
    }
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one field is required' });
    }
  });
export type UpdateSalonInput = z.infer<typeof updateSalonSchema>;

// ---------------- operating hours ----------------

/** 0 = Sunday … 6 = Saturday (1 = Monday, matching the documented example). */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h as number) * 60 + (m as number);
}

export const operatingDaySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    openTime: timeOfDaySchema.optional(),
    closeTime: timeOfDaySchema.optional(),
  })
  .strict()
  .superRefine((day, ctx) => {
    if (!day.isOpen) return; // a closed day does not require (and ignores) times
    if (!day.openTime || !day.closeTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'openTime and closeTime are required for an open day',
      });
      return;
    }
    if (toMinutes(day.openTime) >= toMinutes(day.closeTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closeTime'],
        message: 'closeTime must be after openTime',
      });
    }
  });
export type OperatingDayInput = z.infer<typeof operatingDaySchema>;

/** Full replacement: exactly seven distinct weekdays. Closed days are simply isOpen:false. */
export const putHoursSchema = z
  .object({ days: z.array(operatingDaySchema).length(7) })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set(value.days.map((d) => d.weekday));
    if (seen.size !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['days'],
        message: 'days must cover each weekday 0–6 exactly once',
      });
    }
  });
export type PutHoursInput = z.infer<typeof putHoursSchema>;

export interface OperatingDayDto {
  weekday: number;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface OperatingHoursDto {
  timezone: string;
  /** false when the salon has not configured any open day. */
  configured: boolean;
  days: OperatingDayDto[];
}

// ---------------- services ----------------

export const priceCentsSchema = z.number().int().min(0).max(10_000_000);
export const estimatedMinutesSchema = z.number().int().min(1).max(480);

export const createServiceSchema = z
  .object({
    name: trimmed(1, 80),
    priceCents: priceCentsSchema,
    estimatedMinutes: estimatedMinutesSchema,
    active: z.boolean().optional(),
  })
  .strict();
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: trimmed(1, 80).optional(),
    priceCents: priceCentsSchema.optional(),
    estimatedMinutes: estimatedMinutesSchema.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export interface ServiceDto {
  id: string;
  salonId: string;
  name: string;
  /** Money is stored and exchanged as integer minor units — never floats. */
  priceCents: number;
  currency: typeof CURRENCY;
  estimatedMinutes: number;
  active: boolean;
}

// ---------------- salon responses ----------------

export interface RatingSummary {
  average: number;
  count: number;
}

/**
 * Live Soliton queue info. Phase 1 has no queue engine, so this is always
 * `{ available: false }` — the UI must render an honest non-live state (Phase 2 widens it).
 */
export interface LiveQueueInfo {
  available: false;
}

/** Public-safe salon fields only. Never includes owner, staff, audit or security data. */
export interface PublicSalonDto {
  id: string;
  name: string;
  photoUrl: string | null;
  address: string | null;
  city: string | null;
  location: Location;
  status: SalonStatus;
  openState: OpenState;
  rating: RatingSummary | null;
  /**
   * Straight-line GEOGRAPHIC distance in metres (PostGIS ST_Distance), present only when the
   * caller supplied coordinates. It is NOT a travel time or road distance — never present it
   * as an ETA.
   */
  distanceMeters: number | null;
  liveQueue: LiveQueueInfo;
}

export interface SalonDetailDto extends PublicSalonDto {
  hours: OperatingHoursDto;
  services: ServiceDto[];
}

export interface DiscoverySalonDto extends PublicSalonDto {
  servicePreview: ServiceDto[];
}

/** The signed-in owner/staff member's own salon (includes configuration). */
export interface MySalonDto extends PublicSalonDto {
  viewerRole: 'owner' | 'staff' | 'admin';
  queueStatus: QueueStatus;
  bufferConfig: BufferConfig | null;
  hoursConfigured: boolean;
}

// ---------------- geocoding ----------------

export const geocodeQuerySchema = z.object({ address: z.string().trim().min(3).max(200) }).strict();
/**
 * Address lookup is optional and provider-dependent. With the free local provider it is
 * unavailable, and the response says so honestly instead of guessing coordinates; owners
 * then enter latitude/longitude themselves.
 */
export type GeocodeResponse =
  | { available: true; location: Location; formattedAddress: string | null }
  | { available: false; reason: string };

/** Which provider is active for each external concern. Default: everything free/local. */
export interface ProviderPolicyDto {
  freeLocalMode: boolean;
  providers: {
    map: string;
    otp: string;
    payment: string;
    messaging: string;
    storage: string;
    analytics: string;
  };
  /** Hosts Soliton may call outside this machine. Empty in free-local mode. */
  externalCalls: string[];
}
