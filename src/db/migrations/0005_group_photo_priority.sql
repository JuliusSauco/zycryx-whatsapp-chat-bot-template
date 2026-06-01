ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "welcome_group_photo" boolean DEFAULT false;
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "bye_group_photo" boolean DEFAULT false;
