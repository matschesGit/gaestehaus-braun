-- Add booking extras for richer pricing details.
ALTER TABLE "Booking"
ADD COLUMN "extraGuests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "hasPet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "laundryPackages" INTEGER NOT NULL DEFAULT 0;
