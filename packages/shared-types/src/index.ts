/**
 * @soliton/shared-types
 *
 * Domain-independent shared types only. Feature/domain models (User, Salon,
 * QueueEntry, …) are introduced in later phases alongside the database and API.
 */

/** Opaque string branding helper, e.g. `type UserId = Brand<string, 'UserId'>`. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** ISO-8601 timestamp string (e.g. "2026-01-01T12:00:00.000Z"). */
export type ISODateTime = Brand<string, 'ISODateTime'>;

/** A UUID string. */
export type Uuid = Brand<string, 'Uuid'>;

/** Generic success/error result used by non-throwing call sites. */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/** Standard cursor-paginated collection envelope. */
export interface Paginated<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}
