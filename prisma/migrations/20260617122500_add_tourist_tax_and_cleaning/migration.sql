-- Add configurable tourist tax and end-of-stay cleaning fee.
ALTER TABLE "BookingPricingConfig"
ADD COLUMN "touristTaxPerPersonPerNightCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cleaningFeeCents" INTEGER NOT NULL DEFAULT 0;
