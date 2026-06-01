ALTER TABLE "group_settings" ADD COLUMN IF NOT EXISTS "message_logging" boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS "message_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "group_id" text NOT NULL,
    "user_id" text NOT NULL,
    "message_id" text NOT NULL,
    "message_text" text NOT NULL,
    "message_type" text NOT NULL,
    "is_reply" boolean DEFAULT false,
    "reply_to_message_id" text,
    "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "message_logs_group_created_at_idx"
    ON "message_logs" ("group_id", "created_at");

CREATE INDEX IF NOT EXISTS "message_logs_group_message_id_idx"
    ON "message_logs" ("group_id", "message_id");

CREATE INDEX IF NOT EXISTS "message_logs_user_idx"
    ON "message_logs" ("user_id");
