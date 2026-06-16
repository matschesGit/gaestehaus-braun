-- Normalize legacy inquiry bookings to the open booking state.
UPDATE "Booking"
SET "status" = 'PENDING'
WHERE "status" = 'INQUIRY';

-- Recreate the enum without the obsolete inquiry value.
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";

CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

ALTER TABLE "Booking"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "BookingStatus"
USING ("status"::text::"BookingStatus"),
ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "BookingStatus_old";
