# Testing report

## Current state

```
pnpm typecheck   22/22 workspace tasks pass
pnpm lint        0 errors, 0 warnings
pnpm test        306 API tests pass, 18 skipped · 29 mobile · 54 package
pnpm build       11/11 workspace tasks pass
```

Roughly 390 automated tests. The API suite grew from 192 to 306 during this rebuild.

Run them:

```bash
pnpm test
```

Database-backed tests are opt-in and need a live Postgres:

```bash
RUN_DB_TESTS=1 pnpm --filter @soliton/api test
```

---

## What "verified" means here

Three different strengths of claim are used in this document and in commit messages, and
they are not interchangeable:

| Claim | Means |
|---|---|
| **Tested** | An automated test asserts the behaviour and it passes |
| **Bundled** | It compiles and packages for Android via `expo export` |
| **Not verified** | Reasoned about, typechecked, never executed in its real environment |

The database-dependent work and every screen fall into the third category. See
[LIMITATIONS.md](LIMITATIONS.md).

---

## Two findings about the test suite itself

**The suite was intermittently failing, and it looked like a logic error.** Every
`*.e2e-spec.ts` boots a full Nest application — HTTP server, Socket.IO gateway, Prisma —
and jest's default 5-second timeout cannot absorb several of those starting at once. Under
default parallelism `beforeAll` timed out and *every test in the affected file* was
reported as broken. The same suite passed with `--runInBand`. Fixed at the cause in
`jest.config.cjs` (`testTimeout: 30_000`, `maxWorkers: 2`) and confirmed stable over
consecutive full runs.

**A "green" build was a stale cache hit.** `pnpm build` reported 11/11 passing while
`apps/admin-web` did not build at all — Turbo was replaying a cached success log. A change
that invalidated the cache exposed it. Verified pre-existing by stashing the change and
forcing a rebuild. When a result matters, force it:

```bash
pnpm exec turbo run build --filter=@soliton/admin-web --force
```

---

## Coverage by area

### Queue engine — the strongest area

| Area | Tests | Notes |
|---|---|---|
| ETA engine | 29 | Parallel service, in-progress work, delays, capabilities, requested stylist, determinism, monotonicity |
| Walk-ins and delays | 12 | Input contracts and delay arithmetic including the clamp at zero |
| Queue state machine | pre-existing | Transitions, guards, optimistic version checks |
| Realtime room authorization | pre-existing | Who may subscribe to which room |

ETA cases worth calling out, because they encode product decisions:

- An **overrunning service is not assumed finished** — its remaining time is unknown, and
  assuming otherwise makes every downstream estimate optimistic.
- A service **nobody on shift can perform gets no estimate** rather than a fabricated one,
  and does not block the queue behind it.
- A **requested stylist is a constraint, not a preference** — the customer waits for them.
- **Nothing ever returns a 0-minute wait** while somebody else is in the chair.

### Staff management

26 tests. Covers the owner invariant (a salon must keep at least one active owner through
demote, deactivate and remove), re-hiring a removed member, cross-salon capability
rejection before any write, the IST day boundary for "completed today" (a 22:00 completion
must count as today), and that own-shift resolves from the authenticated user so nobody can
clock a colleague in.

### Notifications

13 tests over the server-composed copy. A test caught a real defect: a position change
with no known position rendered "undefined ahead of your token". Also asserted — estimates
read "about N minutes" and never as a promise, a missing estimate is omitted rather than
invented, zero-ahead reads "you are next", a negative delay reads as *reduced* and never
shows a minus sign, and a paused customer is told they keep their place.

9 further tests cover the device-notification gating, including that a position-only change
stays silent (a buzz per person would be intolerable in a ten-person queue).

### AI assistant

23 tests. Every question Part 12 lists, for both audiences, plus loosely-worded variants.
Asserts that **a local answer can never be labelled Gemini**, that owner guidance does not
leak into customer answers, that the assistant admits ignorance instead of returning its
least-bad entry, that a 429 is handled as an expected outcome, that the key is sent as a
header and never in a URL, that exactly one attempt is made, and that a changed response
shape degrades rather than throws.

### Design system

10 tests, including WCAG contrast assertions for both schemes. These caught that applying
the brand maroon to dark surfaces gave **2.53:1**, well under the 4.5:1 floor — the dark
palette now uses a lightened maroon at 6.18:1 with inverted ink at 5.05:1.

### Guards against regression

`postgis-objects.spec.ts` asserts the PostGIS extension, the `geom` column, the GIST index
and the rating CHECK all exist in migration SQL, that the extension precedes the column,
and that the seed writes coordinates. **It needs no database on purpose** — the bug it
guards survived because every database-backed suite is skipped by default.

`salons.service.spec.ts` pins the exact set of public salon fields, so a column added to
the table cannot leak into a public response unnoticed. It correctly failed when
`category`, `description` and `phone` were added, and now records them as intentional.

---

## Journey testing status

Part 15 asks for specific journeys to be exercised. Honestly:

| Journey | Status |
|---|---|
| Queue logic: join → notify → start → complete | **Tested** at service level with mocked Prisma |
| ETA across all Part 10 inputs | **Tested** exhaustively as pure logic |
| Staff add / capability / shift / removal | **Tested** at service level |
| Owner queue controls | **Tested** at service level (pre-existing) |
| Admin approve / reject / suspend | **Tested** at service level (pre-existing) |
| Auth: OTP, login, refresh, logout | **Tested** (unit) · DB-backed suite skipped |
| Duplicate queue submissions | **Tested** — idempotency key, active-entry guard, walk-in guest-phone guard |
| Invalid input | **Tested** — Zod `.strict()` on every write schema, asserted for mass-assignment rejection |
| Unauthorized operations | **Tested** — cross-salon, staff-as-owner, other users' notifications |
| Empty states | Implemented; **not visually verified** |
| Network failures | Error states implemented; realtime falls back to polling. **Not fault-injected** |
| App restart / expired sessions | Hydration implemented; **not verified end to end** |
| Full UI journeys on a device | **Not done.** No device or emulator available |
| Slow network, database failures | **Not done** |

No feature in this report is called complete because its screen exists.

---

## Suggested next steps

1. Install Docker, migrate, seed, and run `RUN_DB_TESTS=1`. Fix what surfaces.
2. Add a Postgres service container to CI and run the database tests there. The PostGIS
   gap existed for many commits precisely because nothing ran them.
3. Walk the four journeys on a real device with Expo Go.
4. Fix the teardown leak so `--detectOpenHandles` is clean.
5. Add fault injection for offline and slow-network behaviour.
