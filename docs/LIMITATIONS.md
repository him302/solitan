# Limitations

What this prototype does not do, stated plainly. Nothing here is hidden behind a
"coming soon" label in the app.

---

## Not verified against a live database

**This is the most important item on the page.**

Four migrations added during this rebuild — `20261102000000_postgis_geom`,
`20261102000001_staff_on_shift`, `20261102000002_walkin_and_delay` and
`20261103000000_business_category` — have **not been applied to a running Postgres**,
because no Docker or Postgres installation was available on the development machine.

Everything is covered by unit tests against a mocked Prisma client, by typechecking
against the generated Prisma types, and by assertions over the migration SQL itself. None
of that is the same as running it.

Specifically unproven:

- the migrations apply cleanly in sequence
- the `BusinessCategory` enum `DO` block behaves as intended
- the new indexes are created and used
- the seed's `ST_SetSRID`/`ST_MakePoint` writes produce correct points
- discovery returns the seeded salons at the expected distances
- queue concurrency under real transactions and row locks
- the 18 database-backed tests in `auth.e2e-spec.ts`, `database.e2e-spec.ts` and
  `phase1.db.e2e-spec.ts`, which remain skipped

**First action for anyone picking this up:** install Docker, run the steps in
[DATABASE.md](DATABASE.md), then `RUN_DB_TESTS=1 pnpm --filter @soliton/api test`. Treat
any failure there as expected work, not as a surprise.

---

## Not visually verified

The scissor-cut opening animation, every screen added during the rebuild, and dark mode
have been typechecked, unit-tested where they contain logic, and confirmed to bundle for
Android via `expo export`. **None has been seen running on a device or emulator.**

Layout, timing and colour choices are reasoned rather than observed. Expect to adjust the
animation's snip rate and travel speed once you watch it — those are single constants in
`apps/customer-mobile/src/splash/choreography.ts`.

---

## `apps/customer-mobile` is misnamed

It serves customers, owners **and** staff through role-based routing, so the name is
misleading. Renaming it touches the package name, every relative import in the workspace,
the Expo config and `eas.json`, so it was left for a deliberate pass rather than bundled
into feature work.

The superseded `apps/salon-mobile` has been removed. It held a second copy of the nine
owner `(manage)` screens and received none of the work in this rebuild, so it was diverging
with every commit and `pnpm dev` started a competing Expo server for it. Its history is in
git if any of it is wanted back.

## Notifications

- **In-app** notifications work: persisted server-side, readable through
  `/me/notifications`, shown in the inbox.
- **Local device** notifications fire while the app is running, including backgrounded,
  for as long as the realtime socket is alive.
- **A device that has killed the app will not be woken.** True background push needs
  Expo's push service or FCM. Both are free, but both require project credentials and an
  external service, so neither is wired up. The update waits in the in-app inbox instead.
- No SMS, WhatsApp or email is sent, by design. `MESSAGING_PROVIDER=disabled`.

The contract distinguishes `in_app`, `local_device` and `external` explicitly so the system
never reports a delivery it did not make.

---

## AI assistant

- The local knowledge base answers 20 question families well and says "I don't know" with
  suggestions outside them. It is retrieval over curated text, not a language model: it
  will not answer a question nobody anticipated.
- Gemini is off unless an operator sets `ASSISTANT_PROVIDER=gemini` and `GEMINI_API_KEY`.
- **Free-tier terms are not something this project can guarantee.** As checked in November
  2026, Google publishes a free tier that needs no billing account but does **not** publish
  per-model free-tier quotas, and third-party summaries contradict each other. No quota
  figure is encoded anywhere. A 429 is treated as normal and falls back to local.
- Enabling Gemini sends the text of the question to Google. Queue history and personal
  details are not sent. This is stated in the in-app privacy notice.

---

## Maps and location

- Distance is **straight-line** (PostGIS `ST_Distance`), not road distance or travel time.
  The DTO comment says so explicitly to stop it being presented as an ETA.
- No map tiles are loaded by default. `MAP_TILE_URL_TEMPLATE` can point at a self-hosted
  raster server; pointing it at public OpenStreetMap tiles for real traffic would breach
  their usage policy.
- Address → coordinates lookup is unavailable with the local provider, and the API says so
  honestly rather than guessing. Owners enter latitude and longitude themselves.

---

## Payments

No payment provider is connected and none is planned for the pilot. The `payments` module
exists with a mock provider for testing the state machine only. Customers pay the business
directly. The app never asks for card details.

---

## Other gaps

- **OTP storage is in-memory.** Codes are lost on API restart and do not work across
  multiple instances. The Redis seam exists (`otp-store.ts`) and is unimplemented.
- **Appointment slot generation treats all times as UTC.** For IST users this puts slot
  boundaries in the wrong place. The queue path is unaffected.
- **Admin web sessions die when the access token expires** — refresh tokens are
  deliberately not persisted there yet (`api.ts` notes the httpOnly-cookie approach as
  future work).
- **Reviews have no "my reviews" screen**, so the API (`/me/reviews`) has no UI. The menu
  item was removed rather than left pointing nowhere.
- **Recently viewed businesses** (Part 6A) is not implemented. Favourites are, stored on
  the device.
- **Discovery sorting is incomplete.** `DISCOVERY_SORTS` offers only `nearest` and `name`.
  Part 6A also asks for shortest waiting time, most popular and available now. The data to
  compute all three now exists (live queue state is populated, and reviews give
  popularity), so these are additions to the sort clause rather than new plumbing.
- **No Swagger UI.** `SwaggerModule` is disabled in `main.ts` because tsx/esbuild did not
  emit the decorator metadata it needs. The dev script now uses `ts-node` and builds use
  `tsc`, so that blocker is gone and it can be switched back on.
- **Estimated travel time** on business cards is not implemented; only straight-line
  distance is shown, because computing travel time needs a routing service.
- **A pre-existing test teardown leak** logs "a worker process has failed to exit
  gracefully" — sockets or timers outliving `afterAll`. It does not fail the run.
- **No CI run of the database tests.** They are opt-in, which is how the PostGIS gap went
  unnoticed for so long. Wiring them into CI with a Postgres service container is the
  single highest-value CI change available.
