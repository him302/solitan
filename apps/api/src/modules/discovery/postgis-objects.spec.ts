import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the PostGIS objects that the geospatial layer depends on but that Prisma cannot
 * express in `schema.prisma`.
 *
 * These assertions exist because all three were once documented in prisma/README.md as
 * committed while being present in no migration at all: `discovery.sql.ts` and
 * `salon-geo.ts` read and wrote `salons.geom`, no migration created it, and the failure
 * was invisible in CI because every database-backed suite is opt-in behind RUN_DB_TESTS.
 *
 * They run without a database on purpose — a guard that needs Postgres is a guard that
 * does not run.
 */
const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'prisma', 'migrations');
const SCHEMA_PATH = join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma');

/** Every migration's SQL concatenated, which is what `migrate deploy` effectively applies. */
function allMigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readFileSync(join(MIGRATIONS_DIR, entry.name, 'migration.sql'), 'utf8'))
    .join('\n');
}

describe('PostGIS objects required by the geospatial layer', () => {
  const sql = allMigrationSql();
  const schema = readFileSync(SCHEMA_PATH, 'utf8');

  it('creates the postgis extension', () => {
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS "postgis"/i);
  });

  it('creates the salons.geom geography column the discovery SQL depends on', () => {
    expect(sql).toMatch(/ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "geom" geography\(Point, 4326\)/i);
  });

  it('creates the GIST index that makes ST_DWithin usable at scale', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS "salons_geom_gist" ON "salons" USING GIST \("geom"\)/i);
  });

  it('creates the extension before the column that depends on it', () => {
    expect(sql.indexOf('CREATE EXTENSION IF NOT EXISTS "postgis"')).toBeLessThan(
      sql.indexOf('ADD COLUMN IF NOT EXISTS "geom"'),
    );
  });

  it('declares geom in schema.prisma so Prisma preserves rather than drops it', () => {
    expect(schema).toMatch(/geom\s+Unsupported\("geography\(Point, 4326\)"\)\?/);
  });

  it('declares the postgis extension on the datasource', () => {
    expect(schema).toMatch(/extensions\s*=\s*\[postgis\]/);
    expect(schema).toMatch(/previewFeatures\s*=\s*\["postgresqlExtensions"\]/);
  });

  it('keeps the reviews rating CHECK constraint', () => {
    expect(sql).toMatch(/ADD CONSTRAINT "reviews_rating_check"/i);
  });

  it('never drops the manually-managed GIST index or rating CHECK', () => {
    // Comments are stripped first: the migrations discuss DROP INDEX in prose warning
    // future authors not to emit one, and that prose must not read as a violation.
    const statements = sql.replace(/--[^\n]*/g, '');
    expect(statements).not.toMatch(/DROP INDEX[^;]*salons_geom_gist/i);
    expect(statements).not.toMatch(/DROP CONSTRAINT[^;]*reviews_rating_check/i);
  });
});

describe('seed populates geom', () => {
  it('writes every seeded salon location, or discovery returns nothing', () => {
    const seed = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'seed.ts'), 'utf8');
    // Discovery filters on `geom IS NOT NULL`, so a seed that inserts salons without
    // writing their point produces an empty Discover screen even on a correct schema.
    expect(seed).toMatch(/ST_SetSRID\(ST_MakePoint\(/);
  });
});
