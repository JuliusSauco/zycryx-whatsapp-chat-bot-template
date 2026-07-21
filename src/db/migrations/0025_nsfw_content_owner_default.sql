ALTER TABLE "group_settings" ALTER COLUMN "nsfw_access_mode" SET DEFAULT 'owner';

-- La familia explícita pasa a ser owner-only por defecto. El owner puede
-- abrirla después con enable nsfw --all/--admin/--superadmin.
UPDATE "group_settings"
SET "nsfw_access_mode" = 'owner'
WHERE "nsfw_access_mode" IS NULL OR "nsfw_access_mode" = 'all';
