-- Staff availability (Part 8). `active` already records employment at the salon; this
-- records whether an employed member is currently working and able to take customers.
-- The two are deliberately separate: a member who has gone home for the day is still
-- employed, and conflating them would delete them from the roster every evening.
--
-- Defaults to false so that enabling this on an existing database does not silently
-- advertise every employee as available; owners put staff on shift explicitly.
ALTER TABLE "salon_staff" ADD COLUMN IF NOT EXISTS "onShift" BOOLEAN NOT NULL DEFAULT false;

-- Next-customer assignment and the ETA engine both filter on (salonId, active, onShift).
CREATE INDEX IF NOT EXISTS "salon_staff_salonId_active_onShift_idx"
  ON "salon_staff" ("salonId", "active", "onShift");
