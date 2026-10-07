# Soliton Operational Runbook

---

## START SYSTEM

```bash
# 1. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 2. Start API
pnpm --filter @soliton/api dev

# 3. Start admin web (separate terminal)
pnpm --filter admin-web dev
```

Health check:
```bash
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/health/ready   # checks database
curl http://localhost:3000/api/v1/health/realtime # checks Redis
```

---

## STOP SYSTEM

```bash
# Stop API (Ctrl+C in terminal)
# Stop admin web (Ctrl+C in terminal)

# Stop infrastructure
docker compose -f infra/docker-compose.yml down
```

---

## DATABASE

### Migrate (development)
```bash
cd apps/api
npx prisma migrate dev
```

### Migrate (production)
```bash
cd apps/api
npx prisma migrate deploy
```

### Seed (development only — never run in production)
```bash
cd apps/api
npx prisma db seed
```

### Backup (local development)
```bash
pg_dump -U soliton -h localhost soliton > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore (local development)
```bash
psql -U soliton -h localhost soliton < backup_YYYYMMDD_HHMMSS.sql
```

### Connect to local database
```bash
psql -U soliton -h localhost -d soliton
```

---

## REDIS

### Check Redis status
```bash
redis-cli ping  # Should return PONG
```

### Flush Redis (clears realtime state — use with caution)
```bash
redis-cli flushall
```

---

## API

### Check process logs
The API uses structured JSON logging (pino). Filter by level:
```bash
# In production pipe to pino-pretty for readability
node -r ts-node/register src/main.ts | pino-pretty
```

### Check health
```bash
curl http://localhost:3000/api/v1/health/ready
```

Expected response:
```json
{ "status": "ok", "service": "soliton-api", "database": "up", ... }
```

---

## CUSTOMER APP

```bash
cd apps/customer-mobile
npx expo start

# Android emulator
npx expo run:android

# Physical device
npx expo start --tunnel
```

Set `EXPO_PUBLIC_API_BASE_URL` in `apps/customer-mobile/.env` before starting.

---

## SALON APP

```bash
cd apps/salon-mobile
npx expo start

# Android emulator
npx expo run:android
```

---

## ADMIN WEB

```bash
pnpm --filter admin-web dev
# Opens at http://localhost:3001
```

Login: `admin@soliton.local` / `Passw0rd!dev` (development only).

---

## HEALTH CHECK

```bash
# Liveness
curl http://localhost:3000/api/v1/health

# Readiness (checks database)
curl http://localhost:3000/api/v1/health/ready

# Realtime (checks Redis)
curl http://localhost:3000/api/v1/health/realtime

# Provider policy
curl http://localhost:3000/api/v1/health/providers
```

---

## BACKUP

### Development backup procedure

```bash
# Backup
pg_dump -U soliton -h localhost soliton \
  --format=custom \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_YYYYMMDD_HHMMSS.dump | head -20
```

### Production backup

Production database backup is provider-dependent. **Document and test the restore procedure before going live.** A backup is useless unless restoration has been verified.

Recommended minimum:
- Daily automated backups
- 30-day retention
- Monthly restore test to a separate database
- Backup covers: users, salons, services, chairs, queue entries, appointments, reviews, complaints, payments, audit logs

---

## RESTORE

### Development restore

```bash
# Drop and recreate the database
psql -U soliton -h localhost postgres -c "DROP DATABASE IF EXISTS soliton;"
psql -U soliton -h localhost postgres -c "CREATE DATABASE soliton;"

# Restore
pg_restore -U soliton -h localhost -d soliton backup_YYYYMMDD_HHMMSS.dump

# Run any missing migrations
cd apps/api && npx prisma migrate deploy
```

Verify after restore:
```bash
psql -U soliton -h localhost soliton -c "SELECT COUNT(*) FROM users;"
psql -U soliton -h localhost soliton -c "SELECT COUNT(*) FROM salons;"
psql -U soliton -h localhost soliton -c "SELECT COUNT(*) FROM queue_entries;"
```

---

## COMMON ERRORS

### API won't start: "Invalid environment configuration"
Check that all required env vars are set in `apps/api/.env`.
In production, `JWT_ACCESS_SECRET` is mandatory.

### API won't start: "JWT_ACCESS_SECRET is required in production"
Set `JWT_ACCESS_SECRET` to a long random string (≥ 32 characters) in the production environment.

### Health/ready returns 503
Database is not reachable. Check:
- Docker Compose is running: `docker ps`
- `DATABASE_URL` is correct in `.env`
- PostgreSQL is accepting connections: `psql -U soliton -h localhost soliton`

### Android emulator can't reach API
Use `http://10.0.2.2:3000` instead of `http://localhost:3000`.
Set `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` in `apps/customer-mobile/.env`.

### WebSocket disconnects immediately
Token is missing or expired. The client should refresh the access token and reconnect.

### Prisma migration fails: "migration already applied"
```bash
cd apps/api
npx prisma migrate resolve --applied <migration-name>
```

### Prisma migration fails: "migration rolled back"
```bash
cd apps/api
npx prisma migrate resolve --rolled-back <migration-name>
# Then fix the migration SQL and re-run
npx prisma migrate deploy
```

---

## ROLLBACK

### Application rollback
```bash
git revert HEAD
pnpm build
# Redeploy
```

### Database migration rollback
Prisma does not support automatic down-migrations. For each migration that needs rollback:
1. Write a compensating migration (reverse the schema change)
2. Apply it with `prisma migrate deploy`
3. Mark the original migration as rolled-back if needed

### Feature flag rollback
Set the feature flag to `false` in the environment and restart the API:
```
PAYMENTS_ENABLED=false
MOCK_PAYMENTS_ENABLED=false
PILOT_MODE=false
```

---

## DISASTER RECOVERY

| Scenario | Expected behavior | Recovery |
|---|---|---|
| Database unavailable | API returns 503 on all DB-dependent routes; /health/ready returns 503 | Restore DB, restart API |
| Redis unavailable | Realtime falls back to in-memory adapter (single-node only) | Reconnect Redis; no data loss for HTTP flows |
| API process crash | Mobile apps show network error; retry on reconnect | Restart API process |
| Mobile app offline | TanStack Query serves stale data; shows loading/retry UI | Reconnect automatically |
| Admin web unreachable | Admins cannot moderate; salon operations unaffected | Restart admin-web |
