-- Multi-vertical support (Part 2) plus the two public profile fields Part 6B asks for.
--
-- Solitan's queue engine is already domain-neutral — nothing in it assumes haircuts — but
-- a salon could not say what kind of business it is, so a clinic, bank or restaurant had
-- no way to be listed or filtered. This adds that without renaming the existing tables:
-- "salons" stays as the table name because renaming it would churn every query, index and
-- foreign key for a cosmetic gain.

-- The enum is created only if absent, so replaying over a database where it exists is a
-- no-op. DO block because CREATE TYPE has no IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessCategory') THEN
    CREATE TYPE "BusinessCategory" AS ENUM (
      'salon',
      'barber',
      'clinic',
      'hospital',
      'diagnostic_centre',
      'bank',
      'government_office',
      'restaurant',
      'automobile_service',
      'education',
      'other'
    );
  END IF;
END
$$;

-- Defaults to 'salon': every existing row predates this column, and salons are what the
-- pilot serves. NOT NULL with a default so no backfill pass is needed.
ALTER TABLE "salons"
  ADD COLUMN IF NOT EXISTS "category" "BusinessCategory" NOT NULL DEFAULT 'salon';

-- Owner-written blurb and public contact number for the business page.
ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "salons" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Discovery filters by category within the active set, so the index covers both.
CREATE INDEX IF NOT EXISTS "salons_status_category_idx" ON "salons" ("status", "category");
