# Roadmap

Ordered by value per unit of effort, not by theme. Each item says why it matters, so the
order can be argued with rather than just followed.

---

## Immediately — before anything else is built

**1. Run the database.** Install Docker, apply the four unapplied migrations, seed, then
`RUN_DB_TESTS=1 pnpm --filter @soliton/api test`. Four migrations and the whole geospatial
layer have never touched a live Postgres. Everything below is built on the assumption that
this works; find out before adding to it. See [LIMITATIONS.md](LIMITATIONS.md).

**2. Put the database tests in CI** with a Postgres service container. The PostGIS gap —
missing extension, missing column, missing index, discovery broken on every fresh database
— survived many commits precisely because nothing ran them. This is the single highest-value
CI change available.

**3. Walk the app on a device.** Four journeys, Expo Go, one evening. No screen added
during this rebuild has been seen running. Expect to tune the opening animation's timing.

---

## Next — finishing what is started

**4. Retire `apps/salon-mobile` and rename `customer-mobile`.** The second app is a
superseded copy of the owner dashboard that receives none of the new work, so it diverges
with every commit, and `pnpm dev` starts a competing Expo server for it. After removal,
`customer-mobile` should be renamed since it serves customers, owners *and* staff.

**5. Complete discovery sorting.** Shortest wait, most popular and available now (Part 6A).
The data now exists — live queue state is populated and reviews give popularity — so this
is a sort clause, not new plumbing.

**6. Re-enable Swagger.** Disabled because tsx/esbuild dropped decorator metadata; the dev
script now uses `ts-node` and builds use `tsc`, so the blocker is gone. Cheap, and it makes
110 routes self-documenting.

**7. Move OTP storage to Redis.** Codes are in memory today, so they vanish on restart and
break across instances. The seam exists in `otp-store.ts` and Redis is already running.

**8. Fix appointment timezone handling.** Slot generation treats everything as UTC, putting
boundaries in the wrong place for IST. Contained to `slot-generator.ts`.

**9. Persist admin refresh tokens.** Admin sessions currently die when the access token
expires. `api.ts` already notes the httpOnly-cookie approach.

---

## Then — product depth

**10. Background push.** The honest gap in Part 11: a device that has killed the app is not
woken. Expo push or FCM, both free, both needing an external project. `DeviceToken` already
exists in the schema and is unused. Decide deliberately, because it trades the fully-offline
property for reach.

**11. Learned service durations.** The ETA engine's only estimate is
`serviceDurationMinutes`, taken from what the owner configured. Replace it with an observed
average per service — and per staff member, since people genuinely differ — and estimates
improve with no change to the algorithm. The engine was shaped for this: it is a change of
input, not of logic.

**12. Recently viewed businesses** (Part 6A). Device-local, like favourites.

**13. A "my reviews" screen.** `/me/reviews` exists with no UI, which is why the menu item
was removed rather than left pointing nowhere.

**14. Travel time, carefully.** Part 6A asks for estimated travel time. Only straight-line
distance is shown because a routing service is needed. A self-hosted OSRM instance would
keep it free; a hosted routing API would not. Until then, do not present distance as time.

---

## Later — scale and expansion

**15. Prove the multi-vertical story.** `BusinessCategory` supports clinics, banks,
government offices, restaurants, diagnostic centres, car services and schools. Nothing has
been tested with a non-salon business, and the vocabulary is salon-shaped throughout — the
table is still `salons`, the DTOs still say `salon`. Before onboarding a clinic, rename the
domain language and check the terminology a clinic would expect ("patients", "departments").

**16. Multi-instance realtime.** The Redis Socket.IO adapter is wired; running more than
one API instance has not been tried.

**17. Owner-side analytics depth.** Peak-hour and staff-performance endpoints exist; the
mobile analytics screen uses little of it.

**18. Accessibility pass.** Tokens enforce WCAG AA contrast and a 44dp touch target, and
reduced motion is honoured in the opening animation. Nothing has been tested with a screen
reader.

**19. Choose a licence.** Currently all rights reserved by default, which blocks anybody
else contributing.

---

## Deliberately not planned

- **Paid anything** until there is revenue to justify it.
- **iOS**, until Android is proven with real salons. The codebase is cross-platform, so
  this is a testing cost rather than a rewrite.
- **Replacing the queue engine.** It is the strongest part of the codebase: transactional,
  optimistically versioned, audited. Extend it; do not rewrite it.
- **An appointment-first product.** Part 2 is explicit that the live queue is the primary
  system. Appointments stay secondary.
