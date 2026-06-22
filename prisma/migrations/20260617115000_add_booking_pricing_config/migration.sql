-- Store configurable extras pricing in a singleton row.
CREATE TABLE "BookingPricingConfig" (
  "id" TEXT NOT NULL,
  "extraGuestPerNightCents" INTEGER NOT NULL DEFAULT 1500,
  "petFeePerNightCents" INTEGER NOT NULL DEFAULT 1000,
  "laundryPackageFeeCents" INTEGER NOT NULL DEFAULT 1000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingPricingConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BookingPricingConfig" ("id", "extraGuestPerNightCents", "petFeePerNightCents", "laundryPackageFeeCents", "updatedAt")
VALUES ('global', 1500, 1000, 1000, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
