# API reference

NestJS REST API plus a Socket.IO gateway. **110 HTTP routes**, all under `/api/v1`.

Base URL in development: `http://localhost:3000`

**There is no Swagger UI.** `main.ts` disables `SwaggerModule` with the note that
"tsx/esbuild does not emit design:paramtypes metadata" — decorator metadata the module
needs. That blocker no longer applies: the dev script now runs through `ts-node`, and
builds go through `tsc`, both of which emit it. Re-enabling Swagger is a small, worthwhile
task ([ROADMAP.md](ROADMAP.md)). Until then this file is the reference, and it is generated
from the controller sources rather than written from memory.

---

## Conventions

**Validation.** Every write body is validated by a Zod schema from
`@soliton/api-contract`, shared verbatim with the clients so the two cannot drift. All
write schemas are `.strict()`: unknown keys are **rejected**, not ignored, so a client
cannot mass-assign `ownerId`, `status` or `queueStatus` by adding them to a payload.

**Errors.** One envelope everywhere:

```json
{ "code": "SALON_NOT_FOUND", "message": "Salon not found" }
```

`code` is a stable machine-readable string; switch on it rather than on `message`.

**Scope.** A `salonId` in a URL is only ever a lookup key. Access is decided server-side
from the authenticated user and the database (`SalonAccessService`). Passing another
salon's id gets 403, or 404 where revealing existence would leak information.

**Money** is integer paise (`priceCents`), never a float.

**Hidden resources** return **404 rather than 403** where a 403 would confirm that
something exists — a pending salon is invisible to everyone except its own members and
admins.

**Idempotency.** `POST /queue/join` accepts an `Idempotency-Key` header and returns the
existing entry rather than creating a duplicate.

---

## Authentication

JWT bearer access tokens with rotating refresh tokens (hashed at rest, revocable).

```
POST   /auth/otp/request      Request a one-time code (dev provider logs it)
POST   /auth/otp/verify       Exchange the code for tokens
POST   /auth/login            Email + password (owners, staff, admins)
POST   /auth/refresh          Rotate the refresh token
POST   /auth/logout           Revoke
GET    /auth/me               Current user
```

Roles are `customer`, `staff`, `owner`, `admin` globally, and `owner` or `staff` **per
salon** via `SalonStaff`. The two are deliberately separate: salon permissions come from
the membership row, so somebody can be a customer of one salon and staff at another
without their account role changing.

---

## Customer — discovery and queue

```
GET    /discovery/salons              Search: q, city, category, lat/lng, radiusKm, sort
GET    /discovery/map                 Map markers for a viewport
GET    /salons/:salonId               Public detail + hours + services + live queue
GET    /salons/:salonId/services
GET    /salons/:salonId/staff         Public roster (names only)
GET    /salons/:salonId/hours
GET    /salons/:salonId/rating
GET    /salons/:salonId/reviews
```

`sort` accepts only **`nearest`** and **`name`**. Part 6A also asks for shortest-waiting-
time, most-popular and available-now sorting; those are not implemented
([LIMITATIONS.md](LIMITATIONS.md)). Supplying `lat`/`lng` adds `distanceMeters` —
**straight-line PostGIS distance, not travel time.**

Every salon carries `liveQueue`, which is either `{ available: false }` or
`{ available: true, currentToken, totalWaiting, etaMinutes }`. A closed queue reports
unavailable rather than "0 waiting", because a closed queue is not an empty one you can
join.

```
POST   /queue/join                    Join (Idempotency-Key honoured)
GET    /me/bookings                   My entries
GET    /bookings/:id
DELETE /queue/entries/:entryId        Leave the queue
POST   /queue/entries/:entryId/arrive I am here
POST   /queue/entries/:entryId/late   I am running late
```

A customer cannot change their own position. Every state transition is server-side and
audited.

---

## Owner and staff — running the queue

Queue control. All require salon membership:

```
POST   /queue/:salonId/open           Accept customers
POST   /queue/:salonId/limited        Serve walk-ins, stop remote joins
POST   /queue/:salonId/pause          Hold without losing anyone's place
POST   /queue/:salonId/resume
POST   /queue/:salonId/close
PATCH  /queue/:salonId/capacity       Max waiting entries; null = unlimited
PATCH  /queue/:salonId/noshowpolicy
GET    /queue/:salonId/snapshot       Full queue + per-entry ETAs + etaBasis
GET    /queue/:salonId/search         By token, name or phone
```

Per-entry actions:

```
POST   /queue/entries/:entryId/notify          Call them — turn approaching
POST   /queue/entries/:entryId/checkin
POST   /queue/entries/:entryId/start           Begin service
POST   /queue/entries/:entryId/complete
POST   /queue/entries/:entryId/undo-complete
POST   /queue/entries/:entryId/noshow          Counts against the customer
POST   /queue/entries/:entryId/late-response
PATCH  /queue/entries/:entryId/service         Change the service
POST   /queue/:salonId/walkin                  Add somebody at the counter
DELETE /queue/:salonId/entries/:entryId        They cancelled — NOT a no-show
POST   /queue/:salonId/delay                   Running late, with a reason
GET    /queue/:salonId/announcements
POST   /queue/:salonId/announcements           Notice board
```

`noshow` and the staff-side cancel are deliberately distinct. No-show counts against the
customer under the salon's no-show policy; somebody who phoned to cancel should not be
penalised for it.

`POST /queue/:salonId/delay` takes `delayMinutes` (−240…240, non-zero) and an optional
`reason`. It is additive so repeated slips accumulate, may be negative to take back an
over-estimate, and clamps at zero — a salon cannot promise to run early. It also posts an
announcement so the reason reaches customers, and notifies everyone waiting.

Configuration (**owner only** — staff get 403):

```
POST   /salons                        Create (one per owner)
PATCH  /salons/:salonId               Name, address, location, category, description, phone
PUT    /salons/:salonId/hours
POST   /salons/:salonId/services
PATCH  /salons/:salonId/services/:serviceId
DELETE /salons/:salonId/services/:serviceId     Soft delete — history stays valid
GET    /me/salon
```

Staff management (**owner only**):

```
GET    /salons/:salonId/staff/manage            Roster + capabilities + live workload
POST   /salons/:salonId/staff                   Add by phone
GET    /salons/:salonId/staff/:staffId
PATCH  /salons/:salonId/staff/:staffId          Role, employment, availability, name
PUT    /salons/:salonId/staff/:staffId/services Replace capability set wholesale
DELETE /salons/:salonId/staff/:staffId          Soft removal
PATCH  /me/shift                                Staff clock themselves on/off
```

Staff are added by **phone**, not email: the zero-cost policy rules out an email service,
so an emailed invitation would be undeliverable. An unknown phone creates a staff account;
a known one is linked without altering that user's global role or name.

`PATCH /me/shift` takes **no staff id by design**, so one member cannot clock another in or
out.

A salon must always keep at least one active owner. Demote, deactivate or remove attempts
that would break that return `STAFF_LAST_OWNER`.

---

## Notifications

```
GET    /me/notifications              limit, unreadOnly
PATCH  /me/notifications/read         ids, or omit to mark everything read
```

Scoped to the authenticated user: another user's id selects nothing rather than marking
their mail read.

`channel` is always `in_app` from the server. The server never claims `local_device`,
because it cannot know whether a device was reachable or permission granted. `external`
exists in the enum so the seam is visible, and is disabled.

---

## AI assistant

```
GET    /assistant/status              Which engine will answer, and example questions
POST   /assistant/ask                 question, audience: customer | owner
```

Open to signed-out users — somebody evaluating the app should be able to ask how it works
before registering. Rate limited to 15/minute.

Every answer carries `mode` (`local` or `gemini`) naming the engine that actually produced
it, plus `fallbackReason` when Gemini was configured but unusable. A local answer can never
be labelled Gemini: `mode` is set from the branch that produced the text.

---

## Admin

```
GET    /admin/salons                        Directory: search, status, pagination
PATCH  /admin/salons/:id/status             Approve, reject, suspend
GET    /admin/analytics/overview
GET    /admin/analytics/queues
GET    /admin/analytics/appointments
GET    /admin/reviews
PATCH  /admin/reviews/:id/moderation
GET    /admin/complaints
PATCH  /admin/complaints/:id
GET    /admin/payments
```

Admin routes check `role === 'admin'` server-side on every request.

---

## Appointments (secondary)

Solitan is queue-first. Appointments remain for businesses that want slots.

```
GET    /salons/:salonId/availability
POST   /appointments
GET    /me/appointments
GET    /appointments/:id
PATCH  /appointments/:id/cancel
POST   /appointments/:id/check-in | start | complete | no-show | on-way
```

**Known issue:** slot generation treats all times as UTC, so boundaries are wrong for IST.
The queue path is unaffected.

---

## Reviews, complaints, payments

```
POST   /reviews                       After a completed service
GET    /me/reviews
PATCH  /reviews/:id
POST   /complaints
GET    /me/complaints
GET    /me/payments
POST   /payments/mock/create | succeed | fail | refund
```

The `payments/mock/*` routes drive a mock provider for testing the payment state machine.
**No payment provider is connected** and no real money moves.

---

## Health

```
GET    /health                        Liveness
GET    /health/ready                  Readiness — database and Redis
GET    /health/realtime               Socket.IO gateway
GET    /health/providers              Active providers + permitted external hosts
```

`/health/providers` is the quickest way to confirm the zero-cost policy is in force:
`externalCalls` is empty in free-local mode.

---

## Realtime

Socket.IO at the API origin. Authenticate with the same bearer token.

```
subscribe          { room }   Join a room — authorized server-side
unsubscribe        { room }
snapshot:request   { room }   Authoritative current state
```

Rooms are `salon:{salonId}` and `entry:{entryId}`. `RoomAuthorizer` decides membership, so
subscribing to another customer's entry is refused.

Events include `queue.entry.joined`, `notified`, `checked_in`, `arrived`, `started`,
`completed`, `no_show`, `cancelled`, `service_changed`, plus `queue.paused`, `resumed`,
`closed`, `limited`, `opened`, `announcement` and `queue.delayed`.

Every payload carries the queue's `version`, so a client can discard a message it has
already superseded.
