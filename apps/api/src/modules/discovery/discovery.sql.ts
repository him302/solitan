import { Prisma } from '@prisma/client';
import type { DiscoveryQuery, DiscoverySort, MapQuery } from '@soliton/api-contract';

export interface DiscoveryRow {
  id: string;
  name: string;
  photoUrl: string | null;
  address: string | null;
  city: string | null;
  status: string;
  lat: number;
  lng: number;
  distance_m: number | null;
}

/** Escapes LIKE wildcards so user input is matched literally, then wraps it as "contains". */
export function buildSearchPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function hasLocation(query: { lat?: number; lng?: number }): query is { lat: number; lng: number } {
  return query.lat !== undefined && query.lng !== undefined;
}

/**
 * Resolves the sort actually applied. Distance ordering needs coordinates, so "nearest"
 * without them falls back to name rather than failing — and the response says so.
 */
export function resolveSort(query: Pick<DiscoveryQuery, 'sort' | 'lat' | 'lng'>): DiscoverySort {
  if (query.sort === 'name') return 'name';
  return hasLocation(query) ? 'nearest' : 'name';
}

function pointSql(lat: number, lng: number): Prisma.Sql {
  // PostGIS point order is (X, Y) = (longitude, latitude).
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}

/**
 * The discovery query. Everything is parameterised; the only dynamic SQL is structure
 * chosen from a closed set. Only ACTIVE, located salons are ever returned. It fetches
 * `limit + 1` rows so the caller can tell whether another page exists.
 */
export function buildDiscoveryQuery(query: DiscoveryQuery, sort: DiscoverySort): Prisma.Sql {
  const point = hasLocation(query) ? pointSql(query.lat, query.lng) : null;

  const conditions: Prisma.Sql[] = [
    Prisma.sql`s."status" = 'active'`,
    Prisma.sql`s."geom" IS NOT NULL`,
  ];
  if (point && query.radiusKm !== undefined) {
    conditions.push(Prisma.sql`ST_DWithin(s."geom", ${point}, ${query.radiusKm * 1000})`);
  }
  if (query.city) {
    const pattern = buildSearchPattern(query.city);
    conditions.push(Prisma.sql`(s."city" ILIKE ${pattern} OR s."address" ILIKE ${pattern})`);
  }
  if (query.q) {
    const pattern = buildSearchPattern(query.q);
    conditions.push(Prisma.sql`(
      s."name" ILIKE ${pattern}
      OR EXISTS (
        SELECT 1 FROM "services" sv
        WHERE sv."salonId" = s."id" AND sv."active" = true AND sv."name" ILIKE ${pattern}
      )
    )`);
  }

  const distance = point
    ? Prisma.sql`ST_Distance(s."geom", ${point})`
    : Prisma.sql`NULL::double precision`;
  const orderBy =
    sort === 'nearest' && point
      ? Prisma.sql`distance_m ASC, s."name" ASC, s."id" ASC`
      : Prisma.sql`s."name" ASC, s."id" ASC`;

  return Prisma.sql`
    SELECT s."id", s."name", s."photoUrl", s."address", s."city", s."status",
           ST_Y(s."geom"::geometry) AS lat, ST_X(s."geom"::geometry) AS lng,
           ${distance} AS distance_m
    FROM "salons" s
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY ${orderBy}
    LIMIT ${query.limit + 1} OFFSET ${query.offset}`;
}

/** Bounded marker query for the map: nearest first, radius- and count-limited. */
export function buildMapQuery(query: MapQuery): Prisma.Sql {
  const point = pointSql(query.lat, query.lng);
  return Prisma.sql`
    SELECT s."id", s."name", s."photoUrl", s."address", s."city", s."status",
           ST_Y(s."geom"::geometry) AS lat, ST_X(s."geom"::geometry) AS lng,
           ST_Distance(s."geom", ${point}) AS distance_m
    FROM "salons" s
    WHERE s."status" = 'active' AND s."geom" IS NOT NULL
      AND ST_DWithin(s."geom", ${point}, ${query.radiusKm * 1000})
    ORDER BY distance_m ASC, s."id" ASC
    LIMIT ${query.limit}`;
}
