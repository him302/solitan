# Solitan — Phase 1 Development Audit

Audit of the existing codebase (commit `6beb3d7`), performed by reading source rather than
trusting READMEs or prior phase reports. ~29,000 lines across 4 apps and 10 packages.

| Area | Files | Lines |
|---|---|---|
| `apps/api` (NestJS) | 116 | 10,984 |
| `apps/customer-mobile` (Expo) | 57 | 8,132 |
| `apps/salon-mobile` (Expo) | 28 | 3,188 |
| `apps/admin-web` (Next.js) | 21 | 1,798 |
| `packages/*` (10 shared) | 52 | 5,085 |

Verified green at audit time: `install`, `typecheck` (22/22), `lint` (0 errors),
`test` (192 passed / 18 skipped), `build` (11/11).

---

## 1. Existing implementation (works — preserve)

**Database schema — strong, keep it.** 20 models, 12 enums. Genuinely well-designed:
optimistic concurrency (`Queue.queueVersion`), proper token sequencing (`tokenSeq`,
`sequenceSeq`), composite foreign keys (`[id, salonId]`) that make cross-tenant data
leaks structurally impossible, sensible indexes, audit trails (`QueueAudit`,
`PlatformAudit`). Covers almost every entity Part 14 asks for.

**Queue state machine — the strongest asset.** `queue.service.ts` (1,036 lines) implements
~30 operations, nearly all inside `$transaction` with optimistic version checks:
join, leave, notify, check-in, start, complete, no-show, undo-complete, arrive,
report-late, respond-late, change-service, open/pause/resume/close/limited,
set-capacity, set-no-show-policy, announcements, staff search, snapshots.

**Auth — complete.** OTP request/verify, password login, refresh-token rotation
(hashed, revocable), `/auth/me`. Guards: `JwtAuthGuard`, `OptionalJwtAuthGuard`,
`RolesGuard`, `SalonScopeGuard`. Unit-tested.

**Realtime — complete.** Socket.IO gateway with room authorization
(`room-authorizer.ts`, tested), subscribe/unsubscribe/snapshot-request, Redis adapter
seam for multi-instance.

**Admin API — more complete than it first appears.** Split across two controllers both
mounted at `admin`: `admin.controller.ts` (reviews, complaints, payments moderation) and
`reporting.controller.ts` (`GET /admin/salons`, `PATCH /admin/salons/:id/status`,
`analytics/overview|queues|appointments`). Part 9's verify/approve/suspend is wired.

**Zero-cost policy — already enforced in code.** `provider-policy.service.ts` +
`disabled-providers.ts` + env validation reject paid providers. `FREE_LOCAL_MODE=true`,
`MAP_PROVIDER=local`, `OTP_PROVIDER=dev`, payments/messaging `disabled`.

**Code hygiene — good.** Zero dead buttons found (no empty `onPress`, no
"coming soon" alerts). Essentially no TODO debt. Centralised API client
(`packages/api-client`), shared Zod contracts (`packages/api-contract`).

---

## 2. Broken functionality (confirmed defects)

### 2.1 CRITICAL — Discovery cannot work. The `geom` column does not exist.

The entire geospatial layer reads and writes a PostGIS column `salons.geom`:

- `salon-geo.ts:19` writes it (`ST_SetSRID(ST_MakePoint(...))`)
- `discovery.sql.ts:49,52,70,79,92,93,95,96` filters, sorts and measures distance by it

**That column is created nowhere.** It is absent from `schema.prisma` (no `geom`, no
`Unsupported(...)`) and absent from all six migration SQL files. So is
`CREATE EXTENSION postgis` and the GIST index.

`prisma/README.md:51-67` states all three are "committed inside the migration" and that
`geom` is modelled as `Unsupported(...)` with `extensions = [postgis]` on the datasource.
None of that is true — the datasource block is only `provider` + `url`. The README
documents code that was never written. (The rating CHECK constraint it also claims *does*
exist, at `init/migration.sql:464`.)

**Consequence:** on a fresh `prisma migrate deploy`, every discovery query fails at the
SQL level. "Nearby businesses" — the primary customer landing screen — is dead.

**Second, independent defect:** `prisma/seed.ts` never calls `setSalonLocation`, so even
with the column present, all seeded salons would have `geom = NULL`, and discovery filters
on `geom IS NOT NULL`. Discovery would return **zero results**. Two bugs stacked.

This is invisible locally because the three DB-backed test suites are opt-in
(`RUN_DB_TESTS=1`) and skipped by default — so CI stays green over a broken database.

### 2.2 No database available on this machine

Neither Docker nor `psql` is installed, so `infra/docker-compose.yml` (Postgres+PostGIS,
Redis) cannot start. 18 tests in `auth.e2e-spec.ts`, `database.e2e-spec.ts` and
`phase1.db.e2e-spec.ts` are permanently skipped. Nothing touching real SQL, migrations,
PostGIS or concurrency is currently verifiable.

### 2.3 Three apps rendered in three different accent colours

> **Corrected after a closer read.** This entry first claimed that only the splash was
> maroon and the rest of the app was grey, and that dark mode was absent entirely. Both
> were wrong — they came from grepping `ThemeProvider.tsx`, which is a four-line
> re-export, instead of `AppProviders.tsx`, where the real wiring lives. The actual
> defect is different, and wider.

`packages/design-tokens` shipped a **neutral slate** accent (`PLACEHOLDER_ACCENT`,
*"used until the brand color is chosen"*) with a test asserting it was *not* locked to any
brand colour. Each app then resolved its accent differently:

| App | Accent before | Why |
|---|---|---|
| `customer-mobile` | maroon `#A50000` | passed `accent="#A50000"` explicitly in `AppProviders.tsx:28` |
| `salon-mobile` | slate `#4A4A4A` | `<ThemeProvider scheme={scheme}>` — no accent, so it fell through to the placeholder |
| `admin-web` | slate `#4A4A4A` | `build-css.mjs` calls `generateTokensCss()` with no argument |

So the owner app and the admin console were grey while the customer app was maroon. The
`var(--color-accent, #3B5BDB)` blue fallbacks across five admin pages were dead code —
`tokens.css` is imported in `layout.tsx:4`, so the variable was always defined.

**Also a genuine accessibility defect:** dark mode applied the *same* `#A50000` to
near-black surfaces, which measures **2.53:1** — far below the 4.5:1 floor.

**Dark mode itself was already implemented** and this audit was wrong to list it as
missing: `appStore.ts` persists `'system' | 'light' | 'dark'` through SecureStore,
`AppProviders.tsx` resolves `'system'` against `useColorScheme()`, and
`(tabs)/settings.tsx:96` exposes the control. What was missing was a readable dark accent.

### 2.4 Duplicate owner dashboard in two apps

`apps/customer-mobile/app/(manage)/` and `apps/salon-mobile/app/(manage)/` contain the
same nine screens (`index`, `queue`, `services`, `hours`, `profile`, `analytics`,
`appointments`, `reviews`, `_layout`). The customer app gates them on
`user?.role === 'owner' || 'staff'` (`(tabs)/profile.tsx:37`). Two codebases for one
feature — a direct violation of Part 1's "no duplicate screens".

### 2.5 Mock data in a shipping screen

`(tabs)/saved.tsx:5` imports `MOCK_SALONS` from `src/data/mockSalons.ts`. The Saved tab is
fake, outside any labelled demo mode (Part 16 violation).

---

## 3. Incomplete implementation

**ETA engine is too naive for Part 10.** `eta.service.ts` (64 lines) is capacity-aware
(divides by chair count — better than a flat multiplier) but its own comment concedes:
*"we don't track start time per chair in Phase 3 so we use full duration as upper bound."*
It ignores three things the DB already stores and Part 10 explicitly requires:
`QueueEntry.startedAt` (current service progress), `QueueEntry.delayMinutes` /
`Salon.bufferConfig` (business delays), and staff availability — it counts **chairs**, not
available staff, despite `SalonStaff` and `StaffService` capability mapping existing.

**Notifications are in-app rows only, typed for the wrong domain.**
`notifications.service.ts` persists `Notification` records, but every one of its 10 event
types is `APPOINTMENT_*` / `SCHEDULE_CHANGED`. **No queue event is covered** — not joined,
position-changed, turn-approaching, your-turn, queue-paused or queue-closed (all required
by Part 11). Client side: `expo-notifications` is not installed in either mobile app, so
there are no local device notifications at all. The `DeviceToken` table exists, unused.

**OTP store is single-instance.** `otp-store.ts:13`: *"Redis is NOT implemented yet — only
this interface/seam exists."* In-memory only; OTPs are lost on restart and break across
instances.

**Appointment timezone is a stub.** `slot-generator.ts:41`: *"we treat all times as UTC
(salon timezone = UTC placeholder)."* Wrong slot boundaries for IST users.

**Product centre of gravity is wrong.** Part 2 states Solitan is *not* an
appointment-booking platform and that live queue is the primary system. The existing app
leans the other way: a full appointments module (controller, service, slot generator,
`Appointment` model, `booking/confirm`, `appointment/[id]`, `appointment/book/[salonId]`,
`(manage)/appointments`) sits alongside the queue, and notifications serve appointments
only. Needs re-centring on queue-first.

---

## 4. Missing functionality

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | **Scissor / cloth-cut opening animation** (Part 4, Stages 1–2) | **Absent** | `splash.tsx` is a logo fade + spring scale, then a fade-out — precisely the "basic fade" Part 4 forbids. No scissors, cloth, or screen separation. |
| 2 | **Solitan AI Assistant** (Part 12, entire) | **Absent** | Zero matches for `gemini`/`assistant` anywhere in `apps/` or `packages/`. No feature, no fallback FAQ, no provider seam. |
| 3 | **Staff management write API** (Part 8, entire) | **Absent** | `salonStaff.create` appears once (`salons.service.ts:63`) solely to create the owner's own row. No add-staff, remove-staff, assign-service or set-availability endpoint. `SalonStaff`/`StaffService` tables exist with no write path. Part 8 is fully blocked. |
| 4 | **Staff app experience** (Part 8) | **Absent** | No staff-scoped UI. Staff are routed into the owner `(manage)` dashboard with full owner powers — a privilege problem, not just a UX gap. |
| 5 | **Manual / walk-in customer add** (Part 7 #6) | **Absent** | `EntrySource.walkin` enum exists; no endpoint creates one. Owners cannot add an in-person customer. |
| 6 | **Delay management** (Part 7 #11–12 + "Delay Management") | **Absent** | `QueueEntry.delayMinutes` exists in the DB; no controller route ever writes it. Owners cannot communicate a delay. |
| 7 | ~~Dark mode (Part 3)~~ | **Already present** | Audit error, corrected in section 2.3. Persisted in `appStore.ts`, resolved in `AppProviders.tsx`, toggled in `(tabs)/settings.tsx:96`. Only the dark-mode accent contrast needed fixing. |
| 8 | **Business category / multi-vertical support** (Part 2) | **Absent** | `Salon` has no `category` field. Clinics, banks, restaurants etc. cannot be modelled or filtered. Discover has no category row. |
| 9 | Salon description & public contact phone (Parts 6B, 7) | **Absent** | `Salon` has `name`, `address`, `city`, `photoUrl` — no `description`, no `phone`. |
| 10 | Staff availability (Part 8) | **Partial** | `SalonStaff.active` only — no shift/availability model. |
| 11 | Customer tab structure (Part 6) | **Mismatch** | Four visible tabs (Discover, Activity, Saved, Profile); Part 6 specifies three, and Saved is mock-backed. |

---

## 5. Security review

Sound: composite-FK tenant scoping, `SalonScopeGuard`, room authorization, hashed and
rotated refresh tokens, Helmet, CORS allowlist, rate limiting, Zod validation at every
boundary, no secrets in the repo (`.env` gitignored, `.env.example` committed).

Needs work:

- **Staff privilege escalation** — staff reach owner-only controls because they share the
  `(manage)` dashboard (section 4, item 4). Needs role-scoped routes and server-side
  `SalonRole` checks.
- **Admin credentials are seeded** (`admin@soliton.local` with a shared `DEV_PASSWORD`).
  Fine for a demo; must not be reachable in a production build (Part 9).
- **Refresh tokens in the admin web** are deliberately not persisted
  (`api.ts:7` — "refresh via httpOnly cookie is a future phase"), so admin sessions die
  when the access token expires.

---

## 6. Files requiring modification

**Database / backend**

- `apps/api/prisma/schema.prisma` — add `geom Unsupported("geography(Point,4326)")` and
  `extensions = [postgis]`; add `Salon.category`, `description`, `phone`; staff availability.
- new migration — `CREATE EXTENSION postgis`, add `geom`, GIST index.
- `apps/api/prisma/seed.ts` — call `setSalonLocation` for every salon; add staff rows.
- `apps/api/prisma/README.md` — correct the false "manually-managed objects" claims.
- `apps/api/src/modules/queue/eta.service.ts` — rewrite: staff-aware, progress-aware, delay-aware.
- `apps/api/src/modules/queue/queue.{controller,service}.ts` — walk-in add, delay management.
- `apps/api/src/modules/salons/salons.{controller,service}.ts` — staff CRUD, profile fields.
- `apps/api/src/modules/notifications/notifications.service.ts` — queue event types.
- `apps/api/src/modules/auth/otp/otp-store.ts` — Redis implementation.
- `apps/api/src/modules/appointments/slot-generator.ts` — real timezone handling.

**Design system and mobile**

- `packages/design-tokens/src/*` — maroon `#A50000` as the accent; dark palette; update tests.
- `apps/customer-mobile/src/providers/ThemeProvider.tsx` — dark mode.
- `apps/customer-mobile/app/splash.tsx` — replace with the scissor-cut sequence.
- `apps/customer-mobile/app/(tabs)/_layout.tsx` — three tabs.
- `apps/customer-mobile/app/(tabs)/saved.tsx` — real data or removal.
- `apps/customer-mobile/app/(manage)/**` — delete; owner UI consolidates into one place.
- `packages/api-client/src/index.ts` — new endpoints (staff, walk-in, delay, AI, notifications).
- `packages/api-contract` — matching Zod schemas and DTOs.

**New files required**

- `apps/api/src/modules/staff/*` — staff management module.
- `apps/api/src/modules/assistant/*` — AI assistant with a Gemini provider plus rule-based
  fallback behind a provider seam (same pattern as `maps` and `payments`).
- `packages/ui/src/ScissorCut*` — the opening animation component.
- `apps/*/src/notifications/*` — `expo-notifications` registration and local scheduling.
- `docs/API.md`, `docs/TESTING.md`, `docs/FREE_SERVICES.md`, `docs/ROADMAP.md`,
  `docs/ANDROID_BUILD.md`.

---

## 7. Recommended improvements (priority order)

1. Fix the PostGIS gap — nothing in discovery works until `geom` exists and is populated.
2. Get a real database running so DB tests stop being skipped.
3. Apply maroon/white brand and dark mode in `design-tokens` (one change, whole-app effect).
4. Collapse the duplicated `(manage)` dashboard into a single owner surface.
5. Build the staff module — it unblocks Part 8 and the staff-aware ETA.
6. Rewrite the ETA engine against `startedAt`, `delayMinutes` and staff capability.
7. Add walk-in and delay endpoints — owners cannot run a real queue without them.
8. Queue-domain notifications plus `expo-notifications` local delivery.
9. Scissor-cut opening animation.
10. AI assistant with honest mode labelling and a rule-based fallback.
11. Re-centre navigation and copy on queue-first; demote appointments.
12. Add `Salon.category` to make the multi-vertical story real.
