ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "role_description" text;
ALTER TABLE "usuarios" ALTER COLUMN "role" SET DEFAULT 'novato';
UPDATE "usuarios" SET "role" = 'novato' WHERE "role" IS NULL;
ALTER TABLE "usuarios" ALTER COLUMN "role" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "user_group_roles" (
    "group_id" text NOT NULL,
    "user_id" text NOT NULL,
    "role" text NOT NULL,
    "role_description" text,
    "updated_by" text,
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "user_group_roles_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);

CREATE INDEX IF NOT EXISTS "user_group_roles_group_idx" ON "user_group_roles" ("group_id");
CREATE INDEX IF NOT EXISTS "user_group_roles_user_idx" ON "user_group_roles" ("user_id");
