ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "last_message_at" timestamp DEFAULT now();

UPDATE "messages"
SET "last_message_at" = now()
WHERE "last_message_at" IS NULL;
