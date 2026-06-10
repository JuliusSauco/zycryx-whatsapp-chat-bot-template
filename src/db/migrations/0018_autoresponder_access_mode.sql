ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "autoresponder_mode" text DEFAULT 'all';
UPDATE "group_settings" SET "autoresponder_mode" = 'all' WHERE "autoresponder_mode" IS NULL;
