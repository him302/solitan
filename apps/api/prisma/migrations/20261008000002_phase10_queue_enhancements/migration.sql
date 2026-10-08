-- Phase 10: Queue enhancements
-- Arrivals, late reports, service changes, salon announcements, limited queue mode

-- 1. Add 'limited' queue status (must run outside a transaction block in PG < 12; PG 12+ is fine)
ALTER TYPE "QueueStatus" ADD VALUE IF NOT EXISTS 'limited';

-- 2. New columns on queue_entries
ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS "arrivedAt"        timestamptz,
  ADD COLUMN IF NOT EXISTS "lateMinutes"      integer,
  ADD COLUMN IF NOT EXISTS "preferredStaffId" uuid REFERENCES salon_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "slotStartAt"      timestamptz,
  ADD COLUMN IF NOT EXISTS "slotEndAt"        timestamptz,
  ADD COLUMN IF NOT EXISTS "lateAckedAt"      timestamptz,
  ADD COLUMN IF NOT EXISTS "lateAction"       text;

-- 3. Salon announcements: persistent updates feed visible to customers
CREATE TABLE IF NOT EXISTS "salon_announcements" (
  "id"        uuid        NOT NULL DEFAULT gen_random_uuid(),
  "salonId"   uuid        NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  "actorId"   uuid        NOT NULL REFERENCES users(id),
  "type"      text        NOT NULL DEFAULT 'info',
  "body"      text        NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "salon_announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "salon_announcements_salon_created_idx"
  ON salon_announcements("salonId", "createdAt" DESC);

-- 4. Index for arrival queries
CREATE INDEX IF NOT EXISTS "queue_entries_salon_arrived_idx"
  ON queue_entries("salonId", "arrivedAt")
  WHERE "arrivedAt" IS NOT NULL;
