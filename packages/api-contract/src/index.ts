/**
 * @soliton/api-contract
 *
 * Zod contract foundation shared by the API and its clients. Intentionally minimal
 * for Phase 0B: only the cross-cutting envelopes (error shape, health response) are
 * defined here. Feature DTOs are added per domain in later phases — no DTO explosion.
 */
import { z } from 'zod';

/** Standard error envelope returned by every API error response. */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

// ---------------- auth ----------------

/** Platform roles (locked). */
export const roleSchema = z.enum(['customer', 'staff', 'owner', 'admin']);
export type Role = z.infer<typeof roleSchema>;

/** Access + refresh token pair returned by auth endpoints. */
export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresInSeconds: z.number(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

/** The authenticated principal. */
export const currentUserSchema = z.object({
  id: z.string(),
  role: roleSchema,
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

export const requestOtpSchema = z.object({ phone: z.string().min(8).max(20) });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(6),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({ refreshToken: z.string().min(1) });
export type LogoutInput = z.infer<typeof logoutSchema>;

// ---------------- realtime ----------------

/**
 * Versioned realtime event envelope. `version` will eventually carry the salon's
 * queueVersion (a BIGINT serialized as a string); it accepts number or string now.
 */
export const realtimeEventSchema = z.object({
  type: z.string(),
  entityId: z.string(),
  version: z.union([z.number(), z.string()]),
  timestamp: z.string(),
  payload: z.unknown(),
});
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

export interface BuildRealtimeEventInput {
  type: string;
  entityId: string;
  version: number | string;
  payload?: unknown;
}

/** Builds a realtime event envelope (adds the timestamp). */
export function buildRealtimeEvent(input: BuildRealtimeEventInput): RealtimeEvent {
  return {
    type: input.type,
    entityId: input.entityId,
    version: input.version,
    timestamp: new Date().toISOString(),
    payload: input.payload ?? null,
  };
}

export type RoomKind = 'salon' | 'entry';
export interface RoomRef {
  kind: RoomKind;
  id: string;
}

export const salonRoom = (id: string): string => `salon:${id}`;
export const entryRoom = (id: string): string => `entry:${id}`;

/** Parses a room string into a typed ref, or null if malformed/unsupported. */
export function parseRoom(room: string): RoomRef | null {
  const sep = room.indexOf(':');
  if (sep <= 0) return null;
  const kind = room.slice(0, sep);
  const id = room.slice(sep + 1);
  if ((kind === 'salon' || kind === 'entry') && id.length > 0) {
    return { kind, id };
  }
  return null;
}

export const subscribeMessageSchema = z.object({ room: z.string().min(1) });
export type SubscribeMessage = z.infer<typeof subscribeMessageSchema>;

export const snapshotRequestSchema = z.object({ room: z.string().min(1) });
export type SnapshotRequest = z.infer<typeof snapshotRequestSchema>;

/** Foundation snapshot envelope (queue state fields are added in Phase 1). */
export const snapshotSchema = z.object({
  room: z.string(),
  version: z.union([z.number(), z.string()]),
  state: z.unknown(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;

/** Response body for the health endpoint. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  version: z.string(),
  uptimeSeconds: z.number(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ---------------- Phase 1: salons, services, hours, discovery ----------------
export * from './salon';
export * from './discovery';

// ---------------- Phase 2: bookings and queue ----------------
export * from './booking';
