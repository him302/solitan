-- Phase 11: queue capacity + no-show policy

-- Queue max capacity (optional; NULL = unlimited)
ALTER TABLE queues
  ADD COLUMN IF NOT EXISTS "maxCapacity" integer;

-- Salon no-show policy
ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS "noShowPolicy"    text    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "noShowThreshold" integer NOT NULL DEFAULT 2;
