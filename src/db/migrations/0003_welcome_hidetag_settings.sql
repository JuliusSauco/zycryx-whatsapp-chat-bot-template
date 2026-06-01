ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "welcome_config_id" integer;
CREATE SEQUENCE IF NOT EXISTS "group_settings_welcome_config_id_seq";
ALTER SEQUENCE "group_settings_welcome_config_id_seq" OWNED BY "group_settings"."welcome_config_id";
ALTER TABLE "group_settings" ALTER COLUMN "welcome_config_id" SET DEFAULT nextval('"group_settings_welcome_config_id_seq"'::regclass);
UPDATE "group_settings" SET "welcome_config_id" = nextval('"group_settings_welcome_config_id_seq"'::regclass) WHERE "welcome_config_id" IS NULL;
ALTER TABLE "group_settings" ALTER COLUMN "welcome_config_id" SET NOT NULL;
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "welcome_registered_by" text;
ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "welcome_hidetag" boolean DEFAULT false;
