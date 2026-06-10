ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "autoresponder" boolean DEFAULT true;
UPDATE "group_settings" SET "autoresponder" = true WHERE "autoresponder" IS NULL;
