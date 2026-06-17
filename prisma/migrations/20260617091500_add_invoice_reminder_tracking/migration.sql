-- Add dunning and reminder tracking metadata to invoices.
ALTER TABLE "Invoice"
ADD COLUMN "reminderLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextReminderDueAt" TIMESTAMP(3),
ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);
