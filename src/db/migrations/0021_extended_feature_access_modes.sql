ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "downloads_access_mode" text DEFAULT 'all';
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "search_access_mode" text DEFAULT 'all';
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "stickers_access_mode" text DEFAULT 'all';
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "converters_access_mode" text DEFAULT 'all';
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "fun_access_mode" text DEFAULT 'all';

UPDATE "group_settings" SET "downloads_access_mode" = 'all' WHERE "downloads_access_mode" IS NULL;
UPDATE "group_settings" SET "search_access_mode" = 'all' WHERE "search_access_mode" IS NULL;
UPDATE "group_settings" SET "stickers_access_mode" = 'all' WHERE "stickers_access_mode" IS NULL;
UPDATE "group_settings" SET "converters_access_mode" = 'all' WHERE "converters_access_mode" IS NULL;
UPDATE "group_settings" SET "fun_access_mode" = 'all' WHERE "fun_access_mode" IS NULL;
