ALTER TABLE "group_settings"
    ADD COLUMN IF NOT EXISTS "nsfw_gif_enabled" boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS "nsfw_gif_access_mode" text DEFAULT 'owner';

UPDATE "group_settings"
SET "nsfw_gif_enabled" = false,
    "nsfw_gif_access_mode" = 'owner'
WHERE "nsfw_gif_enabled" IS NULL OR "nsfw_gif_access_mode" IS NULL;
