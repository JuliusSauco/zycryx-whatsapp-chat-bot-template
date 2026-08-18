-- Forward migration from the seven-schema normalized baseline.
-- Encryption happens in the application; PostgreSQL only stores authenticated ciphertext.

CREATE SCHEMA IF NOT EXISTS bot_security;
CREATE SCHEMA IF NOT EXISTS bot_sessions;

CREATE TABLE IF NOT EXISTS bot_security.encryption_key_versions (
    version integer PRIMARY KEY,
    algorithm text NOT NULL DEFAULT 'aes-256-gcm',
    kdf text NOT NULL DEFAULT 'raw-key',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    retired_at timestamptz,
    CONSTRAINT encryption_key_versions_version_positive CHECK (version > 0),
    CONSTRAINT encryption_key_versions_algorithm_check CHECK (algorithm = 'aes-256-gcm'),
    CONSTRAINT encryption_key_versions_kdf_check CHECK (kdf IN ('raw-key', 'argon2id'))
);

CREATE TABLE IF NOT EXISTS bot_security.encrypted_secrets (
    name text PRIMARY KEY,
    purpose text NOT NULL DEFAULT 'api-token',
    key_version integer NOT NULL REFERENCES bot_security.encryption_key_versions(version),
    ciphertext bytea NOT NULL,
    iv bytea NOT NULL,
    auth_tag bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_sessions.auth_sessions (
    id text PRIMARY KEY,
    session_type text NOT NULL CHECK (session_type IN ('main', 'subbot')),
    owner_id text,
    bot_jid text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'logged_out', 'revoked', 'error')),
    lease_owner text,
    lease_expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_connected_at timestamptz
);

CREATE TABLE IF NOT EXISTS bot_sessions.auth_credentials (
    session_id text PRIMARY KEY REFERENCES bot_sessions.auth_sessions(id) ON DELETE CASCADE,
    key_version integer NOT NULL REFERENCES bot_security.encryption_key_versions(version),
    ciphertext bytea NOT NULL,
    iv bytea NOT NULL,
    auth_tag bytea NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_sessions.signal_keys (
    session_id text NOT NULL REFERENCES bot_sessions.auth_sessions(id) ON DELETE CASCADE,
    key_type text NOT NULL,
    key_id text NOT NULL,
    key_version integer NOT NULL REFERENCES bot_security.encryption_key_versions(version),
    ciphertext bytea NOT NULL,
    iv bytea NOT NULL,
    auth_tag bytea NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, key_type, key_id)
);

CREATE INDEX IF NOT EXISTS auth_sessions_type_status_idx
    ON bot_sessions.auth_sessions (session_type, status);
CREATE INDEX IF NOT EXISTS auth_sessions_lease_idx
    ON bot_sessions.auth_sessions (lease_expires_at);
CREATE INDEX IF NOT EXISTS signal_keys_session_type_idx
    ON bot_sessions.signal_keys (session_id, key_type);

REVOKE ALL ON SCHEMA bot_security, bot_sessions FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA bot_security, bot_sessions FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON SCHEMA bot_security, bot_sessions FROM anon;
        REVOKE ALL ON ALL TABLES IN SCHEMA bot_security, bot_sessions FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON SCHEMA bot_security, bot_sessions FROM authenticated;
        REVOKE ALL ON ALL TABLES IN SCHEMA bot_security, bot_sessions FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT USAGE ON SCHEMA bot_security, bot_sessions TO service_role;
        GRANT ALL ON ALL TABLES IN SCHEMA bot_security, bot_sessions TO service_role;
    END IF;
END
$$;

ALTER TABLE bot_security.encryption_key_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_security.encrypted_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions.auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions.signal_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS bot_runtime.report_deliveries (
    report_id integer PRIMARY KEY REFERENCES bot_runtime.reports(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'dead')),
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    locked_by text,
    locked_until timestamptz,
    last_error text,
    delivered_message_id text,
    sent_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'bot_runtime' AND table_name = 'reports' AND column_name = 'enviado'
    ) THEN
        INSERT INTO bot_runtime.report_deliveries (report_id, status, sent_at)
        SELECT id, CASE WHEN enviado THEN 'sent' ELSE 'pending' END, CASE WHEN enviado THEN fecha ELSE NULL END
        FROM bot_runtime.reports
        ON CONFLICT (report_id) DO NOTHING;
    END IF;
END
$$;
ALTER TABLE bot_runtime.reports DROP COLUMN IF EXISTS enviado;
CREATE INDEX IF NOT EXISTS report_deliveries_pending_idx ON bot_runtime.report_deliveries (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS report_deliveries_lock_idx ON bot_runtime.report_deliveries (locked_until);
ALTER TABLE bot_runtime.report_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON bot_runtime.report_deliveries FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON bot_runtime.report_deliveries FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON bot_runtime.report_deliveries FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON bot_runtime.report_deliveries TO service_role;
    END IF;
END
$$;

-- The normalized baseline already owns this trigger function. Add triggers only for
-- the tables introduced by this migration and keep reruns idempotent.
DO $$
DECLARE
    item regclass;
BEGIN
    IF to_regprocedure('bot_runtime.set_updated_at()') IS NULL THEN
        RAISE EXCEPTION 'Missing bot_runtime.set_updated_at(); apply the normalized baseline first';
    END IF;

    FOREACH item IN ARRAY ARRAY[
        'bot_security.encrypted_secrets'::regclass,
        'bot_sessions.auth_sessions'::regclass,
        'bot_sessions.auth_credentials'::regclass,
        'bot_sessions.signal_keys'::regclass,
        'bot_runtime.report_deliveries'::regclass
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgrelid = item AND tgname = 'set_updated_at' AND NOT tgisinternal
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s
                 FOR EACH ROW EXECUTE FUNCTION bot_runtime.set_updated_at()',
                item
            );
        END IF;
    END LOOP;
END
$$;
