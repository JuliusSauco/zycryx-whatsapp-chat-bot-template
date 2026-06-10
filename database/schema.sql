-- ============================================================
-- Zycryx WhatsApp Chat Bot Template - clean database schema
-- PostgreSQL 14+
-- ============================================================
-- Purpose:
--   Create the current database structure from zero with CREATE
--   statements only. This file is for manual bootstrap of a clean
--   database when you do not want to replay historical migrations.
--
-- Usage:
--   psql -U <user> -d <database> -f database/schema.sql
--
-- Optional custom schema:
--   CREATE SCHEMA IF NOT EXISTS bot_dev;
--   SET search_path TO bot_dev;
--
-- Important:
--   Do not run the historical Drizzle migrations on top of a database
--   already initialized with this script unless you baseline/mark those
--   migrations as applied first.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id text PRIMARY KEY,
    nombre text,
    registered boolean DEFAULT false,
    num text,
    lid text UNIQUE,
    banned boolean DEFAULT false,
    razon_ban text,
    avisos_ban integer DEFAULT 0,
    warn_pv boolean DEFAULT false,
    warn integer DEFAULT 0,
    warn_antiporn integer DEFAULT 0,
    warn_estado integer DEFAULT 0,
    edad integer,
    gender text,
    birthday date,
    money integer DEFAULT 100,
    limite integer DEFAULT 10,
    exp integer DEFAULT 0,
    banco integer DEFAULT 0,
    level integer DEFAULT 0,
    role text NOT NULL DEFAULT 'novato',
    role_description text,
    reg_time timestamp,
    serial_number text,
    sticker_packname text,
    sticker_author text,
    ry_time bigint DEFAULT 0,
    lastwork bigint DEFAULT 0,
    lastmiming bigint DEFAULT 0,
    lastclaim bigint DEFAULT 0,
    dailystreak bigint DEFAULT 0,
    lastcofre bigint DEFAULT 0,
    lastrob bigint DEFAULT 0,
    lastslut bigint DEFAULT 0,
    timevot bigint DEFAULT 0,
    wait bigint DEFAULT 0,
    crime bigint DEFAULT 0,
    marry text,
    marry_request text
);

-- ------------------------------------------------------------
-- Group settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_settings (
    group_id text PRIMARY KEY,
    welcome_config_id serial NOT NULL,
    welcome boolean DEFAULT true,
    detect boolean DEFAULT true,
    antifake boolean DEFAULT false,
    antilink boolean DEFAULT false,
    antilink2 boolean DEFAULT false,
    virustotal boolean DEFAULT false,
    modohorny boolean DEFAULT false,
    audios boolean DEFAULT false,
    antistatus boolean DEFAULT false,
    modoadmin boolean DEFAULT false,
    photowelcome boolean DEFAULT true,
    welcome_registered_by text,
    welcome_hidetag boolean DEFAULT false,
    welcome_hidetag_mode text DEFAULT 'off',
    welcome_group_photo boolean DEFAULT false,
    bye boolean DEFAULT true,
    bye_config_id serial NOT NULL,
    bye_registered_by text,
    bye_hidetag boolean DEFAULT false,
    bye_hidetag_mode text DEFAULT 'off',
    bye_group_photo boolean DEFAULT false,
    photobye boolean DEFAULT true,
    autolevelup boolean DEFAULT true,
    antiporn boolean DEFAULT false,
    nsfw_horario text,
    swelcome text,
    sbye text,
    spromote text,
    sdemote text,
    sautorespond text,
    banned boolean DEFAULT false,
    expired bigint DEFAULT 0,
    memory_ttl integer DEFAULT 86400,
    primary_bot text,
    autoaccept_mode text DEFAULT 'off',
    message_logging boolean DEFAULT false
);

-- ------------------------------------------------------------
-- Chats
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chats (
    id text PRIMARY KEY,
    is_group boolean DEFAULT true,
    timestamp bigint,
    is_active boolean DEFAULT true,
    bot_id text,
    joined boolean DEFAULT true
);

-- ------------------------------------------------------------
-- Message counters
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    user_id text NOT NULL,
    group_id text NOT NULL,
    message_count integer DEFAULT 0,
    CONSTRAINT messages_user_id_group_id_pk PRIMARY KEY (user_id, group_id)
);

-- ------------------------------------------------------------
-- Group user roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_group_roles (
    group_id text NOT NULL,
    user_id text NOT NULL,
    role text NOT NULL,
    role_description text,
    updated_by text,
    updated_at timestamp DEFAULT now(),
    CONSTRAINT user_group_roles_group_id_user_id_pk PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS user_group_roles_group_idx
    ON user_group_roles (group_id);

CREATE INDEX IF NOT EXISTS user_group_roles_user_idx
    ON user_group_roles (user_id);

-- ------------------------------------------------------------
-- Message logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_logs (
    id serial PRIMARY KEY,
    group_id text NOT NULL,
    user_id text NOT NULL,
    message_id text NOT NULL,
    message_text text NOT NULL,
    message_type text NOT NULL,
    is_reply boolean DEFAULT false,
    reply_to_message_id text,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp,
    deleted_by text,
    deleted_by_lid text,
    created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_logs_group_created_at_idx
    ON message_logs (group_id, created_at);

CREATE INDEX IF NOT EXISTS message_logs_group_message_id_idx
    ON message_logs (group_id, message_id);

CREATE INDEX IF NOT EXISTS message_logs_user_idx
    ON message_logs (user_id);

-- ------------------------------------------------------------
-- Subbots
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subbots (
    id text PRIMARY KEY,
    tipo text DEFAULT 'null',
    name text,
    logo_url text,
    prefix text[] DEFAULT ARRAY['/', '.', '#']::text[],
    mode text DEFAULT 'public',
    owners text[],
    anti_private boolean DEFAULT false,
    anti_call boolean DEFAULT true,
    privacy boolean DEFAULT false,
    prestar boolean DEFAULT false
);

-- ------------------------------------------------------------
-- Characters
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS characters (
    id serial PRIMARY KEY,
    name text NOT NULL,
    url text NOT NULL,
    tipo text,
    anime text,
    rareza text,
    price integer NOT NULL,
    previous_price integer,
    claimed_by text,
    for_sale boolean DEFAULT false,
    seller text,
    votes integer DEFAULT 0,
    last_removed_time bigint
);

-- ------------------------------------------------------------
-- Reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes (
    id serial PRIMARY KEY,
    sender_id text NOT NULL,
    sender_name text,
    mensaje text NOT NULL,
    fecha timestamp DEFAULT now(),
    enviado boolean DEFAULT false,
    tipo text DEFAULT 'reporte'
);

-- ------------------------------------------------------------
-- Chat memory
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_memory (
    chat_id text PRIMARY KEY,
    history jsonb,
    updated_at timestamp DEFAULT now()
);

-- ------------------------------------------------------------
-- Stats
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stats (
    command text PRIMARY KEY,
    count integer DEFAULT 1
);

-- ------------------------------------------------------------
-- API tokens
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_tokens (
    name text PRIMARY KEY,
    token_b64 text NOT NULL
);

-- ------------------------------------------------------------
-- Dynamic audio responses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audio_responses (
    scope text NOT NULL,
    phrase text NOT NULL,
    regex text NOT NULL,
    audio_urls text[] DEFAULT ARRAY[]::text[] NOT NULL,
    deleted boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    CONSTRAINT audio_responses_scope_phrase_pk PRIMARY KEY (scope, phrase)
);

COMMIT;
