-- Ensure all existing entries are blurred
UPDATE "HoldingEntry" SET "isBlurred" = true;

-- Ensure all future entries are blurred by default
ALTER TABLE "HoldingEntry"
ALTER COLUMN "isBlurred" SET DEFAULT true;
