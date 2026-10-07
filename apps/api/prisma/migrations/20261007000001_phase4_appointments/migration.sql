-- Phase 4: Appointments expansion
-- Replaces the minimal 3-value AppointmentStatus enum with the full 7-state lifecycle,
-- then extends the appointments table with staff assignment, linked queue entry,
-- smart-arrival fields, idempotency key, and performance indexes.

-- ── 1. Expand AppointmentStatus enum ─────────────────────────────────────────
-- PostgreSQL cannot remove enum values, so we drop-and-recreate.
-- There is no appointment data at this point (seed creates none), so the column
-- cast is safe.

ALTER TABLE appointments ALTER COLUMN status TYPE text;

DROP TYPE "AppointmentStatus";

CREATE TYPE "AppointmentStatus" AS ENUM (
  'scheduled',
  'confirmed',
  'checked_in',
  'in_service',
  'completed',
  'cancelled',
  'no_show'
);

ALTER TABLE appointments
  ALTER COLUMN status TYPE "AppointmentStatus"
  USING status::"AppointmentStatus",
  ALTER COLUMN status SET DEFAULT 'scheduled'::"AppointmentStatus";

-- ── 2. Add new columns ────────────────────────────────────────────────────────

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS "staffId"           uuid REFERENCES salon_staff(id),
  ADD COLUMN IF NOT EXISTS "durationMinutes"   integer,
  ADD COLUMN IF NOT EXISTS notes               text,
  ADD COLUMN IF NOT EXISTS "idempotencyKey"    text,
  ADD COLUMN IF NOT EXISTS "arrivalNotifiedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "graceExpiresAt"    timestamptz,
  ADD COLUMN IF NOT EXISTS "linkedEntryId"     uuid REFERENCES queue_entries(id);

-- ── 3. Unique constraints ─────────────────────────────────────────────────────

ALTER TABLE appointments
  ADD CONSTRAINT appointments_idempotency_key_key UNIQUE ("idempotencyKey"),
  ADD CONSTRAINT appointments_linked_entry_id_key UNIQUE ("linkedEntryId");

-- ── 4. Performance indexes ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS appointments_customer_scheduled_at
  ON appointments("customerId", "scheduledAt");

CREATE INDEX IF NOT EXISTS appointments_status
  ON appointments(status);

CREATE INDEX IF NOT EXISTS appointments_salon_status_scheduled_at
  ON appointments("salonId", status, "scheduledAt");
