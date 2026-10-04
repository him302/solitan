import { Prisma } from '@prisma/client';
import type { Location } from '@soliton/api-contract';
import type { PrismaService } from '../prisma/prisma.service';

/** Prisma cannot read/write `geography`, so location goes through PostGIS raw SQL. */
type SqlExecutor = Pick<PrismaService, '$executeRaw' | '$queryRaw'>;

/**
 * Stores a point. PostGIS takes (X, Y) = (longitude, latitude) — the reverse of the
 * conversational "lat, lng" order, which is the classic source of swapped-coordinate bugs.
 */
export async function setSalonLocation(
  db: SqlExecutor,
  salonId: string,
  location: Location,
): Promise<void> {
  await db.$executeRaw`
    UPDATE "salons"
    SET "geom" = ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326)::geography
    WHERE "id" = ${salonId}::uuid`;
}

export interface SalonGeoRow {
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
}

/** Coordinates plus (when the viewer supplied a position) the authoritative distance. */
export async function readSalonGeo(
  db: SqlExecutor,
  salonId: string,
  viewer?: Location,
): Promise<SalonGeoRow | null> {
  const distance = viewer
    ? Prisma.sql`ST_Distance("geom", ST_SetSRID(ST_MakePoint(${viewer.longitude}, ${viewer.latitude}), 4326)::geography)`
    : Prisma.sql`NULL::double precision`;
  const rows = await db.$queryRaw<SalonGeoRow[]>`
    SELECT ST_Y("geom"::geometry) AS lat, ST_X("geom"::geometry) AS lng, ${distance} AS distance_m
    FROM "salons" WHERE "id" = ${salonId}::uuid`;
  return rows[0] ?? null;
}
