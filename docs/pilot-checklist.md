# Soliton Raipur Pilot Checklist

Start small: 3–10 pilot salons, controlled user group.

---

## PRE-PILOT SETUP

- [ ] Production database provisioned with PostGIS extension enabled
- [ ] `JWT_ACCESS_SECRET` set to a long random string
- [ ] `CORS_ORIGINS` set to production domain(s) only (not `*`)
- [ ] `PILOT_MODE=true` set in API environment
- [ ] Database migrated (`prisma migrate deploy`)
- [ ] Health check passes: `GET /api/v1/health/ready`
- [ ] HTTPS configured on API and admin web
- [ ] Admin account created for platform operator

---

## SALON ONBOARDING CHECKLIST

For each pilot salon, complete all steps:

### Basic information
- [ ] Salon name
- [ ] Address (full street address)
- [ ] City: Raipur
- [ ] Owner name and email
- [ ] Owner account created (email + password login)

### Configuration
- [ ] Services added with accurate names, prices, and durations
- [ ] Staff added (if separate staff members)
- [ ] Operating hours configured (every day that the salon is open)
- [ ] Chairs added (if using chair-based queue assignment)

### Verification
- [ ] Owner can sign in to the salon app
- [ ] Salon is visible in customer app discovery
- [ ] Test queue join succeeds
- [ ] Test appointment booking succeeds
- [ ] Test check-in succeeds
- [ ] Test service start + completion succeeds
- [ ] Test review submission succeeds

---

## END-TO-END TEST SCRIPT — QUEUE FLOW

Run before opening each pilot salon to customers.

**Scenario: Walk-in queue**

1. Customer opens app → discovers the salon
2. Customer views services and queue status
3. Customer joins queue → receives token number
4. Customer sees their position and ETA
5. Salon staff opens queue → starts service for the customer's entry
6. Customer receives real-time update (in-service)
7. Staff marks service complete
8. Customer's entry moves to completed state
9. Customer receives prompt to leave review
10. Customer submits review (rating + comment)

**Expected outcomes:**
- Token number shown correctly
- Position updates in real-time when earlier customers are served
- ETA decreases as queue advances
- Review is visible in admin moderation queue

---

## END-TO-END TEST SCRIPT — APPOINTMENT FLOW

**Scenario: Booked appointment**

1. Customer opens app → books an appointment at a specific time
2. Appointment appears in customer's activity tab
3. Customer taps "On My Way" when heading to salon
4. Customer checks in on arrival
5. Check-in creates a queue entry linked to the appointment
6. Staff starts service
7. Staff marks service complete
8. Customer submits review

---

## FAILURE RECOVERY TESTS

Run these before go-live:

- [ ] Customer loses internet mid-queue → reconnects → sees correct state
- [ ] Salon staff loses internet → reconnects → queue state preserved
- [ ] API restarted while customers in queue → customers reconnect via snapshot
- [ ] Duplicate queue join attempt → second attempt rejected (idempotency)
- [ ] Salon suspended by admin → new queue joins blocked → existing customers informed

---

## PILOT MONITORING

Check daily during pilot:

- [ ] `GET /api/v1/health/ready` returns `{ "status": "ok", "database": "up" }`
- [ ] `GET /api/v1/health/realtime` returns `{ "status": "ok" }`
- [ ] Admin dashboard loads and shows today's platform overview
- [ ] No new complaints in `open` status older than 24 hours
- [ ] Review moderation queue checked

---

## SUPPORT REFERENCE

Every error response includes a `requestId`. When investigating an issue:

1. Ask the user for the error message and any reference/request ID shown
2. Search API logs: `grep "requestId" | grep "<the-id>"`
3. Check the relevant resource in the admin dashboard (salon, customer, appointment ID)
4. Timeline: use `createdAt` timestamps to reconstruct the sequence

---

## GO-LIVE GATE

Phase 7 is complete. Do NOT go live until:

- [ ] All PASS items in `docs/production-checklist.md` verified
- [ ] All WARNING items reviewed and accepted or mitigated
- [ ] At least one full end-to-end test completed on production environment
- [ ] Backup strategy tested (backup + restore verified)
- [ ] At least one pilot salon onboarded and tested
- [ ] Admin has access and knows how to moderate reviews and complaints
- [ ] Support flow agreed (how users report issues, how to investigate)
