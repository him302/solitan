-- Phase 5: Reviews, Complaints, Payments expansion
-- Extends Review (status, appointmentId, updatedAt, adminNote, make entryId optional),
-- Complaint (category, appointmentId, reviewId, adminNote),
-- Payment (salonId, appointmentId, updatedAt, currency),
-- Salon (averageRating, reviewCount).

-- ── 1. New enums ──────────────────────────────────────────────────────────────

CREATE TYPE "ReviewStatus" AS ENUM ('published', 'hidden', 'under_review', 'removed');

CREATE TYPE "ComplaintCategory" AS ENUM (
  'service', 'wait_time', 'booking', 'staff_behaviour', 'payment', 'other'
);

-- ── 2. Review ─────────────────────────────────────────────────────────────────

-- Make entryId optional (allow NULL — existing rows unaffected, unique index stays valid)
ALTER TABLE reviews ALTER COLUMN "entryId" DROP NOT NULL;

-- Add appointmentId (nullable, unique so one review per appointment)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "appointmentId" uuid REFERENCES appointments(id);
CREATE UNIQUE INDEX "reviews_appointment_id_key" ON reviews("appointmentId") WHERE "appointmentId" IS NOT NULL;

-- Add review lifecycle status
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "status" "ReviewStatus" NOT NULL DEFAULT 'published';

-- Add updatedAt for editing window
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now();

-- Admin note for moderation decisions
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "adminNote" text;

-- Indexes
CREATE INDEX IF NOT EXISTS "reviews_status_idx" ON reviews(status);
CREATE INDEX IF NOT EXISTS "reviews_customer_id_idx" ON reviews("customerId");
CREATE INDEX IF NOT EXISTS "reviews_created_at_idx" ON reviews("createdAt");

-- ── 3. Complaint ──────────────────────────────────────────────────────────────

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS "category" "ComplaintCategory" NOT NULL DEFAULT 'other';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS "appointmentId" uuid REFERENCES appointments(id);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS "reviewId" uuid REFERENCES reviews(id);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS "adminNote" text;

CREATE INDEX IF NOT EXISTS "complaints_status_idx" ON complaints(status);
CREATE INDEX IF NOT EXISTS "complaints_reporter_id_idx" ON complaints("reporterId");

-- ── 4. Payment ────────────────────────────────────────────────────────────────

ALTER TABLE payments ADD COLUMN IF NOT EXISTS "salonId" uuid REFERENCES salons(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "appointmentId" uuid REFERENCES appointments(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'INR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "provider" text NOT NULL DEFAULT 'mock';

CREATE INDEX IF NOT EXISTS "payments_customer_id_idx" ON payments("customerId");
CREATE INDEX IF NOT EXISTS "payments_salon_id_idx" ON payments("salonId");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON payments(status);

-- ── 5. Salon ──────────────────────────────────────────────────────────────────

ALTER TABLE salons ADD COLUMN IF NOT EXISTS "averageRating" float8;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS "reviewCount" integer NOT NULL DEFAULT 0;

-- Rating 1..5 check already exists from init migration.
