# Soliton

> "Don't wait at the salon. Arrive when your chair is ready."

Soliton is a real-time queue and appointment platform for neighbourhood salons.
Customers discover nearby salons, join queues or book appointments, and receive live updates so they can arrive at the right moment. Salon owners manage their queue, services, and bookings from the salon app. Admins monitor and moderate the platform.

## Architecture

| App / Package | Description |
|---|---|
| `apps/api` | NestJS REST + Socket.IO API (PostgreSQL + PostGIS + Redis) |
| `apps/customer-mobile` | Expo / React Native customer app (Android-first) |
| `apps/salon-mobile` | Expo / React Native salon owner/staff app |
| `apps/admin-web` | Next.js admin dashboard |
| `packages/api-contract` | Shared Zod schemas and TypeScript types |
| `packages/api-client` | Typed HTTP client used by all frontends |
| `packages/ui` | Shared design-system components |

**Cost policy: ₹0 external services.** No paid APIs, no AI, no billing.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| pnpm | 9 (managed via `packageManager` field) |
| Docker Desktop | any recent |

---

## Local Setup

### 1. Clone

```bash
git clone https://github.com/him302/solitan.git
cd solitan
pnpm install
```

### 2. Start infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts PostgreSQL 16 with PostGIS and Redis 7 on their default ports.

### 3. Configure environment

```bash
cp apps/api/.env.example            apps/api/.env
cp apps/customer-mobile/.env.example apps/customer-mobile/.env
cp apps/salon-mobile/.env.example    apps/salon-mobile/.env
cp apps/admin-web/.env.example       apps/admin-web/.env.local
```

The defaults work out of the box for local development. No secrets required for dev.

### 4. Migrate and seed the database

```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
cd ../..
```

### 5. Start development servers

```bash
# API (port 3000)
pnpm --filter @soliton/api dev

# Customer app
pnpm --filter customer-mobile start

# Salon app
pnpm --filter salon-mobile start

# Admin web (port 3001)
pnpm --filter admin-web dev
```

Or start all at once:

```bash
pnpm dev
```

### 6. Seed accounts (dev only)

All seeded accounts share the password `Passw0rd!dev`.

| Email | Role |
|---|---|
| admin@soliton.local | admin |
| owner@soliton.local | owner (Soliton Demo Salon) |
| staff@soliton.local | staff |
| customer@soliton.local | customer |

---

## Android emulator

The Android emulator routes `localhost` to itself, not to your machine. Use:

```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

For a physical device on the same LAN, use your machine's LAN IP instead.

---

## Commands

```bash
pnpm typecheck    # TypeScript check all workspaces
pnpm lint         # ESLint all workspaces
pnpm test         # Run all tests
pnpm build        # Production build all workspaces
```

---

## Environment variables

All environment variables are documented in each workspace's `.env.example` file. No secrets are committed. Production requires:

| Variable | Description |
|---|---|
| `JWT_ACCESS_SECRET` | Long random string (≥ 32 chars). Required in production. |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (optional; single-node if absent) |
| `CORS_ORIGINS` | Comma-separated allowed origins (never `*` in production) |

---

## Production checklist

See [`docs/production-checklist.md`](docs/production-checklist.md).

## Runbook

See [`docs/runbook.md`](docs/runbook.md).

## Pilot operations

See [`docs/pilot-checklist.md`](docs/pilot-checklist.md).

---

## Known limitations (V1)

- OTP is `dev` provider only — codes are printed to the API log. A real SMS provider integration requires a new implementation and a future phase.
- Payments are disabled (`PAYMENTS_ENABLED=false`). Mock-payment flow exists but is off by default.
- Map provider is `local` — distance is straight-line geographic distance. Driving-route distance requires a paid or self-hosted routing service.
- PostGIS extension must be enabled on the production database.
- No email notifications — future phase.
- Salon app is landscape-optimised for tablets; phones work but are not the primary target.
