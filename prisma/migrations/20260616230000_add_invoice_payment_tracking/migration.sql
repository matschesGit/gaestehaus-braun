-- Add explicit payment tracking timestamps for installment handling.
ALTER TABLE "Invoice"
ADD COLUMN "depositPaidAt" TIMESTAMP(3),
ADD COLUMN "balancePaidAt" TIMESTAMP(3);
