CREATE TABLE IF NOT EXISTS "audio_responses" (
    "scope" text NOT NULL,
    "phrase" text NOT NULL,
    "regex" text NOT NULL,
    "audio_urls" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "deleted" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "audio_responses_scope_phrase_pk" PRIMARY KEY("scope", "phrase")
);
