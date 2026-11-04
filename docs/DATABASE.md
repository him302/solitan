# Database setup

PostgreSQL with the **PostGIS** extension, plus Redis. PostGIS is not optional: discovery
filters by radius and sorts by distance using `ST_DWithin` and `ST_Distance` against a
`geography` column, so a plain Postgres will fail those queries.

## Start the services

```bash
docker compose -f infra/docker-compose.yml up -d
```

This provides Postgres+PostGIS on 5432 and Redis on 6379, matching the defaults in
`apps/api/.env.example`.

## Configure

```bash
cp apps/api/.env.example apps/api/.env
```

The committed defaults point at the containers above:

```
DATABASE_URL=postgresql://soliton:soliton@localhost:5432/soliton?schema=public
REDIS_URL=redis://localhost:6379
```

## Migrate and seed

```bash
pnpm --filter @soliton/api prisma:migrate
```

```bash
pnpm --filter @soliton/api db:seed
```

The seed is idempotent — it upserts by fixed UUID, so running it twice is safe.

Check migration state at any time:

```bash
pnpm --filter @soliton/api prisma:migrate:status
```

---

## Manually-managed objects

Four database objects cannot be expressed in `schema.prisma` and live in migration SQL.
They are listed in full in [`apps/api/prisma/README.md`](../apps/api/prisma/README.md):

1. `CREATE EXTENSION postgis`
2. `salons.geom` — the `geography(Point, 4326)` column every geospatial query uses
3. the GIST index on `geom`
4. the `reviews.rating` CHECK constraint

**Why this is called out:** items 1–3 were documented as committed long before they
existed. There was no extension, no column and no index in any migration, so discovery
failed at the SQL level on every fresh database, and the seed never wrote coordinates
either — leaving `geom` NULL even where the column existed. Both halves were fixed in
`20261102000000_postgis_geom`. `postgis-objects.spec.ts` now asserts all of it **without
needing a database**, because the original bug survived precisely by hiding behind
database-backed tests that are skipped by default.

If a future generated migration contains a `DROP INDEX` for the GIST index or a
`DROP CONSTRAINT` for the rating CHECK, remove that line before applying it.

---

## Migration history

| Migration | Purpose |
|---|---|
| `20260101000000_init` | Initial schema: 20 models, enums, FKs, indexes, rating CHECK |
| `20261007000001_phase4_appointments` | Appointment model and links |
| `20261008000000_phase5_reviews_complaints_payments` | Reviews, complaints, payments |
| `20261008000001_phase6_analytics` | Analytics support |
| `20261008000002_phase10_queue_enhancements` | Queue state additions |
| `20261008000003_phase11_capacity_noshowpolicy` | Capacity and no-show policy |
| `20261102000000_postgis_geom` | **PostGIS extension, `geom` column, GIST index** |
| `20261102000001_staff_on_shift` | `SalonStaff.onShift` + capacity index |
| `20261102000002_walkin_and_delay` | `guestName`/`guestPhone` for walk-ins |
| `20261103000000_business_category` | `BusinessCategory` enum, `description`, `phone` |

Every migration added during this rebuild is written to be safe on an existing database as
well as a fresh one — guarded with `IF NOT EXISTS`, so replaying over a hand-patched
database is a no-op rather than an error.

---

## Schema overview

20 models. The parts worth knowing:

- **`Queue`** holds `queueVersion` (optimistic concurrency), `tokenSeq` (customer-facing
  token numbers) and `sequenceSeq` (stable ordering). Token generation is an atomic
  increment inside a transaction, so two simultaneous joins cannot collide.
- **`QueueEntry`** is the heart: state machine (`waiting → notified → checked_in →
  in_service → completed`, plus `no_show`, `cancelled`, `bumped`), `startedAt` and
  `delayMinutes` feeding the ETA engine, `guestName`/`guestPhone` for walk-ins without
  accounts.
- **Composite foreign keys** such as `StaffService → SalonStaff(id, salonId)` make
  cross-tenant references structurally impossible, not merely checked in code.
- **`SalonStaff`** separates `active` (employed here) from `onShift` (working right now).
  Only on-shift staff count towards queue capacity.
- **`QueueAudit`** and **`PlatformAudit`** record who changed what.

## Resetting

```bash
docker compose -f infra/docker-compose.yml down -v && docker compose -f infra/docker-compose.yml up -d
```

`-v` destroys the volume, so all data is lost. Then migrate and seed again.
