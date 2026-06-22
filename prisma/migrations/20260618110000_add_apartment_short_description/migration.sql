-- Add short text field for apartment teasers in admin UI
ALTER TABLE "Apartment"
ADD COLUMN "shortDescription" TEXT NOT NULL DEFAULT '';
