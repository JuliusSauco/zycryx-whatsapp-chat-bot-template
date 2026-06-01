ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "is_reply" boolean DEFAULT false;
ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "reply_to_message_id" text;

CREATE INDEX IF NOT EXISTS "message_logs_group_message_id_idx"
    ON "message_logs" ("group_id", "message_id");
