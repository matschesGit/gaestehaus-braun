-- Add dedicated newsletter opt-in field on bookings
ALTER TABLE "Booking"
ADD COLUMN "newsletterOptIn" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from previous internal note marker (if present)
UPDATE "Booking"
SET "newsletterOptIn" = true
WHERE lower(coalesce("internalNotes", '')) LIKE '%newsletter-opt-in: ja%';
