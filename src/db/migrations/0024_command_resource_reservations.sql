CREATE TABLE IF NOT EXISTS "command_resource_reservations" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "plugin_id" text NOT NULL,
    "message_id" text NOT NULL,
    "limit_amount" integer DEFAULT 0 NOT NULL,
    "money_amount" integer DEFAULT 0 NOT NULL,
    "required_level" integer DEFAULT 0 NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "release_reason" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "expires_at" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "command_resource_reservations_pending_expiry_idx"
    ON "command_resource_reservations" ("status", "expires_at");
CREATE INDEX IF NOT EXISTS "command_resource_reservations_user_idx"
    ON "command_resource_reservations" ("user_id");
