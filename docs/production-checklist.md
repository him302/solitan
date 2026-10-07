# Soliton V1 Production Readiness Checklist

Legend: ✅ PASS · ⚠️ WARNING · ❌ FAIL · N/A Not Applicable

---

## SECURITY

| # | Check | Status | Notes |
|---|---|---|---|
| S1 | JWT access token has short TTL (15m default) | ✅ PASS | Configurable via `JWT_ACCESS_TTL` |
| S2 | Refresh token rotation implemented | ✅ PASS | `TokenService.rotateRefreshToken` |
| S3 | Refresh tokens hashed in database | ✅ PASS | SHA-256 hash, raw token never stored |
| S4 | JWT_ACCESS_SECRET required in production | ✅ PASS | `validateEnv` fails startup if missing |
| S5 | Password hashing with argon2 | ✅ PASS | `PasswordService` |
| S6 | No plaintext passwords stored or logged | ✅ PASS | Verified in `AuthService` |
| S7 | Invalid credentials return same message | ✅ PASS | "Invalid credentials" for both user-not-found and wrong-password |
| S8 | Role extracted from JWT, never from request body | ✅ PASS | `JwtAuthGuard` + `CurrentUser` decorator |
| S9 | Admin endpoints require `role === 'admin'` | ✅ PASS | `requireAdmin()` in all admin controllers |
| S10 | Salon owner access enforces salonId ownership | ✅ PASS | `SalonAccessService` |
| S11 | Customer can only access own resources | ✅ PASS | Verified in appointments, reviews, queue |
| S12 | Socket.IO disconnects unauthenticated clients | ✅ PASS | `handleConnection` throws → disconnect |
| S13 | Socket.IO room authorization enforced | ✅ PASS | `RoomAuthorizer` |
| S14 | Helmet security headers enabled | ✅ PASS | `helmet()` in `bootstrap.ts` |
| S15 | Input validation on all mutation endpoints | ✅ PASS | `ZodPipe` + `ValidationPipe` |
| S16 | CORS configurable (defaults `*` in dev) | ⚠️ WARNING | Set `CORS_ORIGINS` to allowlist in production |
| S17 | WebSocket CORS mirrors HTTP CORS setting | ✅ PASS | Fixed in Phase 7 |
| S18 | Stack traces never exposed in production | ✅ PASS | `AllExceptionsFilter(isProduction)` |
| S19 | Secrets never logged | ✅ PASS | `AppConfigService` never logs secret values |
| S20 | Body size limit (1 MB) | ✅ PASS | `bootstrap.ts` |
| S21 | UUIDs validated with `ParseUUIDPipe` | ✅ PASS | All `/:id` params use it |
| S22 | Rate limiting on auth endpoints | ✅ PASS | `ThrottlerGuard` on `AuthController` |
| S23 | Tokens stored in OS keychain on mobile | ✅ PASS | `expo-secure-store` |
| S24 | No AI API calls anywhere | ✅ PASS | Provider schema only allows `local`/`disabled` |
| S25 | No paid service calls anywhere | ✅ PASS | `FREE_LOCAL_MODE=true` enforced in schema |

---

## DATABASE

| # | Check | Status | Notes |
|---|---|---|---|
| D1 | All migrations versioned | ✅ PASS | Prisma migrate |
| D2 | Foreign key constraints | ✅ PASS | Prisma schema |
| D3 | Unique constraints on critical fields | ✅ PASS | email, phone, idempotencyKey |
| D4 | Analytics indexes (Phase 6) | ✅ PASS | migration `20261008000001_phase6_analytics` |
| D5 | PostGIS extension required | ⚠️ WARNING | Must be enabled on production DB (`CREATE EXTENSION postgis`) |
| D6 | DATABASE_URL required in production | ⚠️ WARNING | No startup failure if missing — app crashes at first DB call |
| D7 | Backup strategy documented | ✅ PASS | See Runbook section DATABASE |
| D8 | No seed data in production | ✅ PASS | Seed script is dev-only (`prisma/seed.ts`) |

---

## API

| # | Check | Status | Notes |
|---|---|---|---|
| A1 | Health liveness endpoint (`GET /api/v1/health`) | ✅ PASS | |
| A2 | Health readiness with DB check (`GET /api/v1/health/ready`) | ✅ PASS | Added Phase 7 |
| A3 | Request ID on every response | ✅ PASS | `RequestIdMiddleware` |
| A4 | Structured logging (pino) | ✅ PASS | |
| A5 | Sanitized error envelope | ✅ PASS | `AllExceptionsFilter` |
| A6 | Pagination on all list endpoints | ✅ PASS | cursor-based or offset |
| A7 | Unlimited record returns prevented | ✅ PASS | max 100 per page enforced |
| A8 | API versioning (`/v1/`) | ✅ PASS | |
| A9 | Graceful shutdown | ✅ PASS | `enableShutdownHooks()` |

---

## REALTIME

| # | Check | Status | Notes |
|---|---|---|---|
| R1 | Authenticated WS handshake | ✅ PASS | Token verified on connect |
| R2 | Unauthenticated connections rejected | ✅ PASS | `client.disconnect(true)` |
| R3 | Room authorization enforced | ✅ PASS | `RoomAuthorizer` |
| R4 | Salon isolation (customers can't join other salons) | ✅ PASS | |
| R5 | Snapshot recovery on reconnect | ✅ PASS | `snapshot:request` event |
| R6 | Redis adapter for multi-node (optional) | ✅ PASS | Uses in-memory if Redis absent |

---

## MOBILE

| # | Check | Status | Notes |
|---|---|---|---|
| M1 | Tokens stored in OS keychain | ✅ PASS | expo-secure-store |
| M2 | Token refresh on 401 | ✅ PASS | `api-client` HttpClient |
| M3 | API URL configurable via env | ✅ PASS | `EXPO_PUBLIC_API_BASE_URL` |
| M4 | Android emulator URL documented | ✅ PASS | `.env.example` + `app.config.ts` comments |
| M5 | App version 1.0.0 | ✅ PASS | Updated Phase 7 |
| M6 | versionCode set | ✅ PASS | `versionCode: 1` |
| M7 | Secure storage (not AsyncStorage) for tokens | ✅ PASS | |

---

## ADMIN WEB

| # | Check | Status | Notes |
|---|---|---|---|
| W1 | Auth guard redirects to login | ✅ PASS | `authClient.getUser()` check |
| W2 | Admin-only actions confirmed with dialog | ✅ PASS | `window.confirm()` on activate/suspend |
| W3 | HTTPS required in production | ⚠️ WARNING | Enforce at deployment level (nginx/CDN) |

---

## CI/CD

| # | Check | Status | Notes |
|---|---|---|---|
| C1 | GitHub Actions CI workflow | ✅ PASS | Added Phase 7 |
| C2 | Install, typecheck, lint, test, build | ✅ PASS | `.github/workflows/ci.yml` |
| C3 | Runs on push to main and PRs | ✅ PASS | |
| C4 | PostgreSQL and Redis in CI | ✅ PASS | Services in CI job |

---

## COST

| # | Check | Status | Notes |
|---|---|---|---|
| $1 | No paid APIs | ✅ PASS | |
| $2 | No AI APIs | ✅ PASS | |
| $3 | No paid maps | ✅ PASS | |
| $4 | No SMS / WhatsApp | ✅ PASS | |
| $5 | No payment gateway active | ✅ PASS | `PAYMENTS_ENABLED=false` |
| $6 | No billing account required | ✅ PASS | |
| $7 | External development cost | ✅ ₹0 | |

---

## KNOWN LIMITATIONS (V1)

- OTP is `dev` provider: codes printed to logs, no real SMS.
- Payments disabled by default; mock flow available for testing only.
- Map distance is straight-line (no routing).
- `DATABASE_URL` absence does not cause clean startup failure — will crash on first DB query.
- CORS defaults to `*` — must be tightened before production launch.
- No email notifications.
