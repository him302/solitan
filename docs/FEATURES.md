# Feature status

What works, what is partial, what is absent. "Works" means the behaviour is implemented
end to end and covered by a test or exercised through a real code path — **not** that a
screen exists for it. Anything not verified against a live database or a device is marked,
because that distinction is the honest one. See [LIMITATIONS.md](LIMITATIONS.md) and
[TESTING.md](TESTING.md).

Legend: **✅ works** · **🟡 partial** · **❌ absent** · **⚠️ works, unverified in its real environment**

---

## Brand and design system (Part 3)

| Feature | Status | Notes |
|---|---|---|
| Royal Maroon `#A50000` as the brand accent | ✅ | Token default, so all three apps inherit from one place. Previously only the customer app was maroon; the owner app and admin console rendered in a neutral slate placeholder |
| White secondary | ✅ | |
| Dark mode | ✅ | Persisted in `appStore`, resolved against the device scheme, toggled in settings. Already existed — the audit was wrong to list it missing |
| Readable dark-mode accent | ✅ | Pure maroon on near-black measured **2.53:1**, below the 4.5:1 floor. Dark mode now uses a lightened maroon at 6.18:1 with inverted ink at 5.05:1 |
| WCAG AA contrast enforced | ✅ | Asserted in tests for both schemes rather than eyeballed |
| Consistent spacing, radii, type scale, motion | ✅ | `@soliton/design-tokens`, consumed by mobile and web |
| Reduced-motion support | ✅ | Honoured by the opening animation |

## Opening animation (Part 4)

| Feature | Status | Notes |
|---|---|---|
| Cloth screen | ⚠️ | Woven maroon fabric, drawn from plain views |
| Scissors cutting across | ⚠️ | Blades rotate about a pivot, snipping repeatedly as they travel |
| Halves separating | ⚠️ | Top and bottom part along a frayed cut, with a slight fall rotation |
| Logo reveal | ⚠️ | Scales in behind the parted cloth |
| Does not block startup | ✅ | Session hydration runs concurrently; routing waits for both |
| Does not replay on navigation | ✅ | Module flag, reset on cold start |
| Lightweight, no animation library | ✅ | React Native `Animated` only — no Reanimated, SVG, Lottie or Skia. Every animated property is a transform or opacity, so it runs on the native driver |
| Timing under 3s | ✅ | Asserted in tests |

Marked ⚠️ throughout: typechecked, unit-tested for choreography, and bundles for Android,
but **never seen running**.

## Customer app (Part 6)

| Feature | Status | Notes |
|---|---|---|
| Three primary tabs | ✅ | Discover, Activity, Profile. Was four, with a mock-backed Saved tab |
| Search by name, area, service | ✅ | |
| Filter by business category | ✅ | All eleven verticals |
| Nearby businesses with distance | ⚠️ | PostGIS; straight-line, never presented as travel time |
| **Live queue status on every card** | ⚠️ | Current token, number waiting, estimate. Was hardcoded to "unavailable" for every salon |
| "Available Now" section | ⚠️ | Filters on live queue state — had always rendered empty because that state was never populated |
| Open/closed status | ✅ | Including an honest "unconfigured" when hours are unset |
| Business detail page | ⚠️ | Images, address, hours, services with prices, staff, queue state, notice board |
| Description and public phone | ✅ | Both were absent from the schema |
| Join queue | ✅ | Service selection, token, position, estimate |
| Duplicate protection | ✅ | Idempotency key, active-entry guard, and a guest-phone guard for walk-ins |
| Live token screen | ⚠️ | Token, position, people ahead, estimate, staff, state |
| Realtime updates | ✅ | Socket.IO with authorized rooms; falls back to polling |
| Arrived / report late | ✅ | |
| Activity history | ⚠️ | Active and past entries |
| Favourites | ✅ | Persisted on the device. The heart previously wrote to component state and forgot on unmount |
| Profile menu | ✅ | **Nine dead menu items** had no handler at all; all now route somewhere real |
| Notification inbox | ⚠️ | New screen over the Part 11 API |
| Terms and privacy | ⚠️ | New screen, written to describe what this app actually does |
| Recently viewed | ❌ | Not implemented |
| Travel time | ❌ | Needs a routing service |

## Owner app (Part 7)

| Feature | Status | Notes |
|---|---|---|
| Dashboard with today's figures | ⚠️ | Queue size, completed, appointments, average wait, rating |
| Start / pause / resume / close queue | ✅ | |
| Limited mode | ✅ | Serves walk-ins while stopping remote joins |
| **Add a walk-in customer** | ✅ | `EntrySource.walkin` existed; nothing could create one. No account is created — a known phone is linked so that customer can follow their token |
| Call next customer | ✅ | |
| Start / complete service | ✅ | |
| Undo completion | ✅ | |
| Mark no-show | ✅ | |
| **Remove a cancelled customer** | ✅ | Deliberately distinct from no-show, which counts against the customer |
| **Communicate delays** | ✅ | `delayMinutes` existed in the schema with no route writing it. Additive, negative allowed, clamped at zero, announces the reason, notifies everyone waiting |
| Update service duration | ✅ | Via the services screen; feeds every estimate |
| Queue capacity | ✅ | |
| No-show policy | ✅ | |
| Notice board | ✅ | |
| Business profile management | ✅ | Name, logo, images, address, contact, services, prices, hours, description, category |
| Search the queue | ✅ | By token, name or phone |

## Staff (Part 8)

Previously **unreachable**: the only `salonStaff.create` in the codebase gave a new salon's
owner their own membership row, so no owner could add anybody.

| Feature | Status | Notes |
|---|---|---|
| Add staff | ✅ | By phone — the zero-cost policy rules out email invitations |
| Remove staff | ✅ | Soft, so served history and audit rows stay valid |
| Assign services | ✅ | Replaces the capability set wholesale |
| Set availability | ✅ | New `onShift`, separate from `active` so staff do not leave the roster each evening |
| Staff set their own availability | ✅ | `/me/shift` takes no staff id, so nobody can clock a colleague in |
| View workloads | ✅ | Who is serving which token, completed today, who was requested by name |
| Separate staff login | ✅ | OTP on the added phone |
| Staff-scoped experience | ✅ | Staff previously saw the **full owner dashboard** — profile, pricing, hours, analytics. Now role-gated |
| Owner retains control | ✅ | Every write is owner-checked server-side; a salon must keep one active owner |

## Admin (Part 9)

| Feature | Status | Notes |
|---|---|---|
| View registered businesses | ✅ | Search, status filter, pagination |
| Verify / approve / reject / suspend | ✅ | Via `PATCH /admin/salons/:id/status` |
| Application statistics | ✅ | Overview, queue and appointment analytics |
| Review moderation | ✅ | |
| Complaint handling | ✅ | |
| Secure admin auth | ✅ | Server-side role check on every route; no hardcoded credentials in client code |
| **The admin dashboard builds at all** | ✅ | It did not. Two React majors in one workspace, papered over by a postinstall script that rewrote `node_modules/react`. Fixed at the source: Next 15 + React 19 throughout, script deleted |
| Monitor system health | 🟡 | `/health/*` endpoints exist; no admin UI for them |

## Queue estimation (Part 10)

| Input | Status | Notes |
|---|---|---|
| Service duration | ✅ | Per service, not one average |
| Customers ahead | ✅ | |
| **Available staff** | ✅ | On-shift staff, not chair count |
| **Staff capabilities** | ✅ | A service routes only to someone trained for it |
| **Current service progress** | ✅ | Uses `startedAt`; the old engine conceded it ignored this |
| **Business delays** | ✅ | `delayMinutes` per entry |
| Parallel service | ✅ | Discrete-event simulation across servers |
| Requested stylist | ✅ | A constraint, not a preference |
| Presented as approximate | ✅ | Copy says "about N minutes"; asserted in tests |
| Honest about confidence | ✅ | `etaBasis` reports whether the estimate came from staff, chairs or an assumption |
| Room for learned durations | ✅ | Duration is the only estimate; swapping it is a change of input |

## Notifications (Part 11)

| Feature | Status | Notes |
|---|---|---|
| In-app notifications | ✅ | Eleven queue event types. Previously only `APPOINTMENT_*` existed, and there was **no controller**, so rows were written and never read |
| Local device notifications | ⚠️ | `expo-notifications`, raised on realtime transitions |
| Channels distinguished | ✅ | `in_app`, `local_device`, `external` modelled explicitly; the server never claims a delivery it cannot verify |
| Joined / position / turn near / turn / delay / pause / close / complete | ✅ | |
| Server-composed copy | ✅ | One wording for every client; exhaustive switch so a new type cannot ship blank |
| Background push | ❌ | Needs Expo push or FCM — free, but external. Documented |
| SMS / WhatsApp / email | ❌ | By design |

## AI assistant (Part 12)

| Feature | Status | Notes |
|---|---|---|
| Local knowledge base | ✅ | 20 entries covering every question Part 12 lists, both audiences. Offline, no key, no account |
| Admits when it does not know | ✅ | Offers answerable questions instead of its least-bad match |
| Optional Gemini | ✅ | Off unless provider and key are both set |
| Never claims Gemini when local | ✅ | `mode` set from the branch that produced the text; shown as a badge |
| Quota exhaustion handled | ✅ | 429 is an expected outcome, falls back with a reason |
| No key in client code | ✅ | Server env only, sent as a header |
| Enable later without a rebuild | ✅ | Two environment variables |

## Zero-cost policy (Part 13)

| Requirement | Status |
|---|---|
| No paid APIs, maps, SMS, payments, analytics, AI, hosting | ✅ |
| Enforced in code, not just documented | ✅ `provider-policy.service.ts`, env validation |
| Fully usable offline demo | ✅ |
| External dependencies documented | ✅ [FREE_SERVICES.md](FREE_SERVICES.md) |

## Database and security (Part 14)

| Requirement | Status | Notes |
|---|---|---|
| All suggested entities | ✅ | 20 models; `AdminUsers` is `Role.admin`, `QueueHistory` is `QueueAudit` plus entry states |
| **PostGIS actually present** | ⚠️ | The extension, `geom` column and GIST index existed in **no** migration. Discovery failed at the SQL level on every fresh database. Fixed; unverified against live Postgres |
| Foreign keys, indexes, validation | ✅ | |
| Role-based permissions | ✅ | Global role plus per-salon membership |
| Cross-tenant isolation | ✅ | Composite foreign keys make it structurally impossible |
| No mass assignment | ✅ | Every write schema `.strict()` |
| Secure sessions | ✅ | Hashed, rotating, revocable refresh tokens |
| No privileged credentials in the app | ✅ | |

## Code quality (Part 16)

| Requirement | Status | Notes |
|---|---|---|
| No dead buttons | ✅ | Nine were found and fixed, plus a dead Edit button |
| No mock data outside demo mode | ✅ | `mockSalons.ts` deleted with the Saved tab |
| No fabricated features | ✅ | A "Solitan Premium — Priority booking" card advertising a non-existent paid tier was removed |
| No dead code | ✅ | Superseded `eta.service.ts`, orphaned `listStaff`, unused premium styles and the React-patching postinstall script all deleted |
| Centralised API handling | ✅ | One typed client for all front ends |
| Shared types, no drift | ✅ | Zod contracts shared by API and clients |
| No duplicated business logic | 🟡 | `salon-mobile` still duplicates the owner dashboard — see [LIMITATIONS.md](LIMITATIONS.md) |
| Honest documentation | ✅ | `prisma/README.md` claimed objects were committed that did not exist; corrected with the history recorded |
