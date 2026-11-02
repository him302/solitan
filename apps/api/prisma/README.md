# Soliton database (Prisma)

PostgreSQL + PostGIS via Prisma. The schema is the locked ERD (`schema.prisma`).

## Local workflow

```bash
# 1. Start Postgres + PostGIS
docker compose -f ../../infra/docker-compose.yml up -d

# 2. Validate / generate (no DB needed)
pnpm --filter @soliton/api prisma:validate
pnpm --filter @soliton/api prisma:generate

# 3. Apply migrations to a fresh database (canonical workflow — NOT `prisma db push`)
pnpm --filter @soliton/api prisma:migrate        # prisma migrate deploy

# 4. Seed deterministic dev data
pnpm --filter @soliton/api db:seed

# 5. Run DB tests (opt-in; requires a migrated + seeded database)
RUN_DB_TESTS=1 pnpm --filter @soliton/api test
```

`DATABASE_URL` is read from `apps/api/.env` (gitignored; local non-secret default).

## UUID strategy

All primary keys use **DB-side** `@default(dbgenerated("gen_random_uuid()"))` (`gen_random_uuid()`
is in core PostgreSQL 13+, so no `pgcrypto` extension is required). Every insert path —
Prisma, raw SQL, psql, seeds — gets an id automatically.

## BigInt

`Queue.queueVersion`, `Queue.sequenceSeq` and `QueueEntry.sequenceNo` are PostgreSQL
`BIGINT` / Prisma `BigInt`. API JSON serialization of these values is handled in a later
phase (they will be serialized as strings in the API contract).

## INV-OWNER (invariant)

Every `Salon.ownerId` MUST have a matching **active** `SalonStaff` row with
`userId = ownerId`, `salonId = salon.id`, `role = owner`, `active = true`.

It is **not** a database constraint. It is preserved by application code: salon creation
(and the seed) insert the salon and its owner `SalonStaff` row together in one logical
unit. A DB trigger could harden this later if salons are ever mutated outside the service
layer.

## Manually-managed database objects (drift handling)

Four objects are not expressible in `schema.prisma` and live in the migration SQL:

1. `CREATE EXTENSION IF NOT EXISTS "postgis"` — emitted before the `geography` column that
   depends on it. Also declared in the datasource (`extensions = [postgis]`,
   `postgresqlExtensions` preview) so Prisma manages and keeps it.
   Added in `20261102000000_postgis_geom`.
2. `ALTER TABLE "salons" ADD COLUMN "geom" geography(Point, 4326)` — the column every
   geospatial query in `salon-geo.ts` and `discovery.sql.ts` reads and writes.
   Added in `20261102000000_postgis_geom`.
3. `CREATE INDEX ... USING GIST ("geom")` — a GIST index on the `Unsupported`
   `geography` column. Added in `20261102000000_postgis_geom`.
4. `ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK (rating >= 1 AND rating <= 5)`
   — present since `20260101000000_init` (line 464).

> **Historical note.** Items 1–3 were described in this file as committed long before they
> existed: there was no `postgis` extension, no `geom` column and no GIST index in any
> migration, the datasource declared no `extensions`, and `schema.prisma` declared no
> `geom` field. Discovery therefore failed at the SQL level on every fresh database, and
> `seed.ts` compounded it by never writing the coordinates it already defined, leaving
> `geom` NULL even where the column existed. Both halves were fixed in
> `20261102000000_postgis_geom` and the accompanying seed change. Treat this section as a
> description of the migrations named above, not as a statement of intent.

How drift is prevented:

- These statements are **committed inside the migration** and are replayed into the
  shadow database and every real database, so the DB always matches migration history —
  no drift is reported for existing objects.
- The `geom` column is modeled (`Unsupported(...)`) so Prisma preserves it; the extension
  is modeled via the datasource so Prisma keeps it. The GIST index and the CHECK
  constraint are **manually managed**.
- Future migrations are generated with `prisma migrate dev --create-only` and **reviewed
  by a human**; if a generated migration ever contains a `DROP INDEX` for the GIST index
  or a `DROP CONSTRAINT` for the rating CHECK, that line is removed before applying. (A CI
  grep guard enforces this.)
- `prisma migrate deploy` (production/apply) never diffs — it only applies committed
  migrations — so there is no drift risk at deploy time.
