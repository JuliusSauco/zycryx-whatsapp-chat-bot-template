ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "deleted_by" text;
