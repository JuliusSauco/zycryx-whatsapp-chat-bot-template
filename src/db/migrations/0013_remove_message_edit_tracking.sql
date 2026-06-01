DROP TABLE IF EXISTS "message_edit_logs";
ALTER TABLE "message_logs" DROP COLUMN IF EXISTS "is_edited";
ALTER TABLE "message_logs" DROP COLUMN IF EXISTS "edited_at";
