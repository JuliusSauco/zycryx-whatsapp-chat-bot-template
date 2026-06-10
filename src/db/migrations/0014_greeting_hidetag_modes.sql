ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "bye" boolean DEFAULT true;
UPDATE "group_settings" SET "bye" = true WHERE "bye" IS NULL;

ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "welcome_hidetag_mode" text DEFAULT 'off';
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "bye_hidetag_mode" text DEFAULT 'off';

UPDATE "group_settings"
SET "welcome_hidetag_mode" = CASE WHEN "welcome_hidetag" THEN 'all' ELSE 'off' END
WHERE "welcome_hidetag_mode" IS NULL OR "welcome_hidetag_mode" = 'off';

UPDATE "group_settings"
SET "bye_hidetag_mode" = CASE WHEN "bye_hidetag" THEN 'all' ELSE 'off' END
WHERE "bye_hidetag_mode" IS NULL OR "bye_hidetag_mode" = 'off';
