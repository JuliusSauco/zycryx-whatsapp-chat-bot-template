CREATE TABLE IF NOT EXISTS "group_censored_users" (
    "group_id" text NOT NULL,
    "user_id" text NOT NULL,
    "user_lid" text,
    "censored_by" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "group_censored_users_group_id_user_id_pk" PRIMARY KEY ("group_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "group_censored_users_group_lid_idx"
    ON "group_censored_users" ("group_id", "user_lid");
