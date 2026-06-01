-- ============================================================
-- Legacy PostgreSQL -> Drizzle baseline
-- ============================================================
-- Usa este script SOLO para bases existentes creadas antes de
-- la migracion a Drizzle. No lo uses en bases nuevas.
--
-- Objetivo:
-- 1. Normalizar columnas historicas con nombres quoted/camelCase.
-- 2. Migrar tokens(id, value) hacia api_tokens(name, token_b64).
-- 3. Marcar las migraciones iniciales de Drizzle como aplicadas
--    para que `npm run db:migrate` continue desde la siguiente.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS api_tokens (
    name      TEXT PRIMARY KEY,
    token_b64 TEXT NOT NULL
);

DO $$
BEGIN
    IF to_regclass('tokens') IS NOT NULL THEN
        INSERT INTO api_tokens (name, token_b64)
        SELECT id, encode(convert_to(value, 'UTF8'), 'base64')
        FROM tokens
        WHERE id IS NOT NULL
          AND value IS NOT NULL
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('group_settings') IS NOT NULL THEN
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS antistatus BOOLEAN DEFAULT false;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS virustotal BOOLEAN DEFAULT false;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS modoadmin BOOLEAN DEFAULT false;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS photowelcome BOOLEAN DEFAULT false;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS photobye BOOLEAN DEFAULT false;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS autolevelup BOOLEAN DEFAULT true;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS antiporn BOOLEAN DEFAULT false;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS nsfw_horario TEXT;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS swelcome TEXT;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS sbye TEXT;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS spromote TEXT;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS sdemote TEXT;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS sautorespond TEXT;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS expired BIGINT DEFAULT 0;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS memory_ttl INTEGER DEFAULT 86400;
        ALTER TABLE group_settings ADD COLUMN IF NOT EXISTS primary_bot TEXT;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'group_settings' AND column_name = 'antiStatus'
        ) THEN
            EXECUTE 'UPDATE group_settings SET antistatus = "antiStatus" WHERE "antiStatus" IS NOT NULL';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'group_settings' AND column_name = 'sWelcome'
        ) THEN
            EXECUTE 'UPDATE group_settings SET swelcome = COALESCE(swelcome, "sWelcome") WHERE "sWelcome" IS NOT NULL';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'group_settings' AND column_name = 'sBye'
        ) THEN
            EXECUTE 'UPDATE group_settings SET sbye = COALESCE(sbye, "sBye") WHERE "sBye" IS NOT NULL';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'group_settings' AND column_name = 'sPromote'
        ) THEN
            EXECUTE 'UPDATE group_settings SET spromote = COALESCE(spromote, "sPromote") WHERE "sPromote" IS NOT NULL';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'group_settings' AND column_name = 'sDemote'
        ) THEN
            EXECUTE 'UPDATE group_settings SET sdemote = COALESCE(sdemote, "sDemote") WHERE "sDemote" IS NOT NULL';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'group_settings' AND column_name = 'sAutorespond'
        ) THEN
            EXECUTE 'UPDATE group_settings SET sautorespond = COALESCE(sautorespond, "sAutorespond") WHERE "sAutorespond" IS NOT NULL';
        END IF;
    END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS drizzle;

CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at numeric
);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'legacy-baseline-0001', 1780272000000
WHERE NOT EXISTS (
    SELECT 1
    FROM drizzle.__drizzle_migrations
    WHERE created_at >= 1780272000000
);

COMMIT;
