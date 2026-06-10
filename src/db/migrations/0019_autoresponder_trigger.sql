ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "autoresponder_trigger" text DEFAULT 'mention';
UPDATE "group_settings" SET "autoresponder_trigger" = 'mention' WHERE "autoresponder_trigger" IS NULL;
