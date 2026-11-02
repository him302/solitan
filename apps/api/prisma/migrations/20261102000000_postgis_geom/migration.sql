-- Restores the three PostGIS objects that prisma/README.md documented as committed but
-- which were never actually written into any migration. Without them the `salons.geom`
-- column that `salon-geo.ts` and `discovery.sql.ts` read and write does not exist, and
-- every discovery query fails at the SQL level.
--
-- Written to be safe on an existing database as well as a fresh one: each statement is
-- guarded, so replaying it over a database where an operator added these objects by hand
-- is a no-op rather than an error.

-- 1. The extension. Must precede the geography column that depends on it.
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. The geography column itself (lon, lat / SRID 4326), modelled in schema.prisma as
--    Unsupported("geography(Point, 4326)") so Prisma preserves rather than drops it.
ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326);

-- 3. The GIST index that makes ST_DWithin and ST_Distance usable at scale. Manually
--    managed: if a generated migration ever emits DROP INDEX for this, remove that line.
CREATE INDEX IF NOT EXISTS "salons_geom_gist" ON "salons" USING GIST ("geom");
