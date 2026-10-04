# Soliton

Real-time queue and capacity-management platform for neighbourhood salons.

This repository is a **pnpm + Turborepo monorepo** containing the customer app, the salon
owner/staff app, the admin web dashboard, the backend API, and the shared packages they
build on.

> **Status:** Phase 0A — monorepo foundation only. Apps are placeholder entry points; the
> framework scaffolding (Expo, Next.js, NestJS), database, auth, realtime, design system,
> and Puff mascot are introduced in later phases.

## Requirements

- **Node.js** — version pinned in [`.nvmrc`](./.nvmrc) (Node 20 LTS). Use `nvm use` if you
  have nvm.
- **pnpm** — version pinned via the `packageManager` field in the root `package.json`.
  Enable it with Corepack: `corepack enable` (or invoke via `corepack pnpm <cmd>`).

## Install

```bash
pnpm install
```

## Common commands

Run from the repository root:

| Command          | What it does                                          |
| ---------------- | ----------------------------------------------------- |
| `pnpm build`     | Build every workspace (`turbo run build`).            |
| `pnpm dev`       | Run dev tasks (`turbo run dev`).                      |
| `pnpm typecheck` | Type-check every workspace (`turbo run typecheck`).   |
| `pnpm lint`      | Lint the whole repo with the shared ESLint config.    |
| `pnpm format`    | Format with Prettier (`format:check` to verify only). |
| `pnpm test`      | Run tests (`turbo run test`).                         |

Inspect the task graph with `pnpm turbo run build --graph` (or `corepack pnpm turbo run build --dry`).

## Repository structure

```
soliton/
├─ apps/
│  ├─ customer-mobile/   # Customer app (React Native + Expo) — scaffolded in 0B
│  ├─ salon-mobile/      # Salon owner/staff app (React Native + Expo) — 0B
│  ├─ admin-web/         # Admin dashboard (Next.js) — 0B
│  └─ api/               # Backend API (NestJS modular monolith) — 0B
├─ packages/
│  ├─ shared-types/      # Shared domain types/enums
│  ├─ api-contract/      # Shared API + realtime contracts
│  ├─ ui/                # Shared UI components
│  ├─ design-tokens/     # Design token source + generated themes
│  ├─ mascot/            # Puff mascot state machine
│  ├─ i18n/              # English + Hindi internationalization
│  ├─ maps/              # Vendor-neutral maps abstraction (free local provider only)
│  ├─ realtime-client/   # Socket.IO client wrapper
│  └─ config/            # Shared ESLint + Prettier configuration
├─ infra/                # Local + production infrastructure (later phases)
├─ .github/workflows/    # CI/CD (later phase)
└─ .husky/               # Git hooks (later phase)
```

## Package naming convention

Every workspace is published internally under the **`@soliton/*`** scope and is referenced
by that name across the monorepo, e.g.:

```ts
import { createWorkspaceCheck } from '@soliton/shared-types';
```

## Architecture rules

- **Apps may depend on shared packages** (`@soliton/*`).
- **Apps must NOT import from other apps.** Cross-app code belongs in a shared package.
- **Shared/business logic lives once** in a package, not duplicated across apps.
- All shared tooling config (TypeScript base, ESLint, Prettier) is centralized
  (`tsconfig.base.json`, `@soliton/config`) so every workspace stays consistent.
