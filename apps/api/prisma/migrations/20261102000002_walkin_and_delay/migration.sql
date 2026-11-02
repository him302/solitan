-- Walk-in customers (Part 7 #6). EntrySource already had a `walkin` value but nothing
-- could create one, and QueueEntry had nowhere to record who the person is: customerId
-- is nullable, so an account-less walk-in would have been an anonymous row.
--
-- Deliberately NOT creating accounts for walk-ins: most are one-off, and filling the
-- users table with people who never asked for an account would be worse than storing the
-- two fields the owner typed. Where the phone matches an existing account the entry is
-- linked to it instead, so that customer can follow their token in the app.
ALTER TABLE "queue_entries" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "queue_entries" ADD COLUMN IF NOT EXISTS "guestPhone" TEXT;

-- Duplicate protection for walk-ins without an account: the existing guard keys on
-- customerId, which is null here, so the same phone is checked among live entries.
CREATE INDEX IF NOT EXISTS "queue_entries_salonId_guestPhone_idx"
  ON "queue_entries" ("salonId", "guestPhone");
