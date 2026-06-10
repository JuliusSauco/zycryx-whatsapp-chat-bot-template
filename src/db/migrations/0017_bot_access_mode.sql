ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "bot_access_mode" text DEFAULT 'all';
UPDATE "group_settings"
SET "bot_access_mode" = CASE
    WHEN "modoadmin" = true THEN 'admin'
    ELSE 'all'
END
WHERE "bot_access_mode" IS NULL OR "bot_access_mode" = 'all';
