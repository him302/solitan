-- Phase 6: Analytics indexes + PlatformAudit table

-- Queue analytics indexes
CREATE INDEX IF NOT EXISTS "queue_entries_salon_created_idx"
  ON queue_entries("salonId", "createdAt");

CREATE INDEX IF NOT EXISTS "queue_entries_salon_state_created_idx"
  ON queue_entries("salonId", "state", "createdAt");

CREATE INDEX IF NOT EXISTS "queue_entries_salon_service_idx"
  ON queue_entries("salonId", "serviceId");

-- Appointment analytics indexes
CREATE INDEX IF NOT EXISTS "appointments_salon_scheduled_idx"
  ON appointments("salonId", "scheduledAt");

CREATE INDEX IF NOT EXISTS "appointments_salon_status_scheduled_idx"
  ON appointments("salonId", "status", "scheduledAt");

CREATE INDEX IF NOT EXISTS "appointments_salon_service_idx"
  ON appointments("salonId", "serviceId");

-- Review analytics indexes
CREATE INDEX IF NOT EXISTS "reviews_salon_created_idx"
  ON reviews("salonId", "createdAt");

-- Complaint analytics indexes
CREATE INDEX IF NOT EXISTS "complaints_salon_created_idx"
  ON complaints("salonId", "createdAt");

-- Platform audit table
CREATE TABLE IF NOT EXISTS "platform_audits" (
  "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
  "actorId"    uuid        NOT NULL REFERENCES users(id),
  "action"     text        NOT NULL,
  "entityType" text        NOT NULL,
  "entityId"   uuid        NOT NULL,
  "metadata"   jsonb,
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "platform_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_audits_actor_idx"   ON platform_audits("actorId");
CREATE INDEX IF NOT EXISTS "platform_audits_entity_idx"  ON platform_audits("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "platform_audits_created_idx" ON platform_audits("createdAt");
