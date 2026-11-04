# Solitan

> "Don't wait at the salon. Arrive when your chair is ready."

Solitan is a **live queue-management platform**. Customers join a queue remotely, watch
their position move in real time, and set off when their turn is near. Businesses run the
queue from a phone without any technical knowledge.

It is **not an appointment-booking app**. The primary flow is joining a queue that is
already running. Appointments exist as a secondary path for businesses that want slots.

Built for neighbourhood salons first, on an architecture that is domain-neutral — nothing
in the queue engine assumes haircuts, so clinics, banks, government offices, restaurants,
diagnostic centres, car services and schools are all expressible today via
`BusinessCategory`.

**Running cost: ₹0.** No paid APIs, maps, SMS, payment, analytics, hosting or AI
subscriptions. See [docs/FREE_SERVICES.md](docs/FREE_SERVICES.md).

---

## Contents

| Document | What it covers |
|---|---|
| [docs/DATABASE.md](docs/DATABASE.md) | Postgres + PostGIS setup, migrations, seeding |
| [docs/API.md](docs/API.md) | All 110 endpoints, auth model, error envelope |
| [docs/FEATURES.md](docs/FEATURES.md) | Feature-by-feature status: works, partial, absent |
| [docs/TESTING.md](docs/TESTING.md) | What is tested, what is verified, what is not |
| [docs/LIMITATIONS.md](docs/LIMITATIONS.md) | Honest list of what this prototype does not do |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What to build next, in order |
| [docs/FREE_SERVICES.md](docs/FREE_SERVICES.md) | Every external dependency and its cost |
| [docs/ANDROID_BUILD.md](docs/ANDROID_BUILD.md) | Running on a device and producing an APK |
| [docs/AUDIT.md](docs/AUDIT.md) | The audit this rebuild started from |

---

## Architecture

| Workspace | Description |
|---|---|
| `apps/api` | NestJS REST + Socket.IO API (PostgreSQL + PostGIS + Redis) |
| `apps/customer-mobile` | Expo / React Native app — **all four roles**, Android-first |
| `apps/admin-web` | Next.js 15 platform-admin dashboard |
| `apps/salon-mobile` | Legacy owner app, superseded — see [docs/LIMITATIONS.md](docs/LIMITATIONS.md) |
| `packages/api-contract` | Zod schemas + DTOs — one source of truth for API and clients |
| `packages/api-client` | Typed, framework-free HTTP client used by every front end |
| `packages/design-tokens` | Brand, colour, type, spacing and motion tokens |
| `packages/ui` | Shared React Native component library |
| `packages/maps`, `realtime-client`, `i18n`, `mascot`, `shared-types`, `config` | Supporting libraries |

The mobile app serves customers, owners and staff through role-based routing; platform
admins use the web dashboard.

---

## Prerequisites

- **Node.js 20+** (24 works)
- **pnpm 9** — `corepack enable && corepack prepare pnpm@9.15.9 --activate`
- **Docker Desktop** — for Postgres + PostGIS + Redis
- **Expo Go** on an Android phone, or an Android emulator

---

## Quick start

```bash
pnpm install
```

```bash
docker compose -f infra/docker-compose.yml up -d
```

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
pnpm --filter @soliton/api prisma:migrate && pnpm --filter @soliton/api db:seed
```

```bash
pnpm dev
```

`pnpm dev` runs the API, the admin web and the Expo dev server together. Scan the QR code
with Expo Go.

If the API cannot be reached from your phone, set the LAN address the device should call:

```bash
echo "EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000" >> apps/customer-mobile/.env
```

---

## Demo accounts

Created by the seed. The password is the same for all of them and is **development-only**
— it is not a secret and must never be used outside local development.

| Role | Email | Password |
|---|---|---|
| Platform admin | `admin@soliton.local` | `Passw0rd!dev` |
| Salon owner (demo salon, 3 services, 2 staff) | `owner@soliton.local` | `Passw0rd!dev` |
| Staff member | `staff@soliton.local` | `Passw0rd!dev` |
| Staff member (colourist) | `staff2@soliton.local` | `Passw0rd!dev` |
| Customer | `customer@soliton.local` | `Passw0rd!dev` |
| Owner, pending verification | `newowner@soliton.local` | `Passw0rd!dev` |

Four more owners (`owner2`–`owner5@soliton.local`) hold the other seeded salons.

Seeded data: five salons across Raipur with real coordinates, services with prices and
durations, operating hours, two on-shift staff plus a working owner at the demo salon, and
one salon deliberately left without hours so the "unconfigured" state is demonstrable.

Admin sign-in is at http://localhost:3001.

---

## Try the full flow

**As a customer** — sign in as `customer@soliton.local`, allow location, and the Discover
tab lists the seeded salons by distance with live queue state. Open one, join the queue,
and the token screen shows your position and estimate.

**As the owner** — sign in as `owner@soliton.local` on a second device or after signing
out. Open the queue, call the customer, start and complete the service. The customer's
screen updates within moments, and they get a notification when their turn is called.

**Walk-ins and delays** — on the Queue tab, *Add Walk-in* puts somebody at the counter
into the queue without an app, and *Running Late* pushes everyone's estimate back with a
reason attached.

**Staff** — sign in as `staff@soliton.local`. You get the queue and your own shift toggle,
and none of the owner-only configuration.

**The assistant** — Profile → Solitan Assistant. It answers from a local guide with no key
or network; the badge on each answer names the engine that produced it.

---

## Commands

```bash
pnpm dev          # API + admin web + Expo together
pnpm build        # build every workspace
pnpm typecheck    # tsc across all 22 workspace tasks
pnpm lint         # eslint
pnpm test         # unit + mocked-API tests
pnpm format       # prettier
```

Database-backed tests are opt-in because they need a live Postgres:

```bash
RUN_DB_TESTS=1 pnpm --filter @soliton/api test
```

---

## Security notes

- Secrets live in `apps/api/.env`, which is gitignored. Only `.env.example` is committed.
- `JWT_SECRET` is required in production and the API refuses to start without it.
- The seeded admin account exists for the demo. Do not deploy a database seeded this way.
- No service-role key or privileged credential is ever sent to a mobile client.

---

## Licence

No licence has been chosen yet, so default copyright applies: all rights reserved.
