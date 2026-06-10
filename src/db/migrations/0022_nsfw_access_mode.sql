ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "nsfw_access_mode" text DEFAULT 'all';
