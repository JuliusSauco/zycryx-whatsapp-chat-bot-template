ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "games_access_mode" text DEFAULT 'all';
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "tools_access_mode" text DEFAULT 'all';
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "rpg_access_mode" text DEFAULT 'all';

UPDATE "group_settings" SET "games_access_mode" = 'all' WHERE "games_access_mode" IS NULL;
UPDATE "group_settings" SET "tools_access_mode" = 'all' WHERE "tools_access_mode" IS NULL;
UPDATE "group_settings" SET "rpg_access_mode" = 'all' WHERE "rpg_access_mode" IS NULL;
