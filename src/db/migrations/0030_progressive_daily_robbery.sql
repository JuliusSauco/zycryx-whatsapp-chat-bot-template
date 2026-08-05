ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "rob_daily_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "rob_day" date;

UPDATE "usuarios"
SET "lastrob" = 0,
    "rob_daily_count" = 0,
    "rob_day" = NULL;
