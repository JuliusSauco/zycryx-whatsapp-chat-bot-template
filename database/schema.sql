-- ============================================================
-- OLYMPUS COMMUNITY WHATSAPP CHATBOT — Database Schema
-- PostgreSQL 14+
-- ============================================================
-- Ejecutar con: psql -U <user> -d <database> -f schema.sql
-- O desde el cliente: \i schema.sql
-- ============================================================

BEGIN;

-- -----------------------------------------------------------
-- 1. USUARIOS
-- Almacena datos de cada usuario que interactúa con el bot.
-- PK: id (JID de WhatsApp, ej: 5491112345678@s.whatsapp.net)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id               TEXT PRIMARY KEY,
    nombre           TEXT,
    registered       BOOLEAN   DEFAULT false,
    num              TEXT,
    lid              TEXT UNIQUE,

    -- Moderación
    banned           BOOLEAN   DEFAULT false,
    razon_ban        TEXT,
    avisos_ban       INTEGER   DEFAULT 0,
    warn_pv          BOOLEAN   DEFAULT false,
    warn             INTEGER   DEFAULT 0,
    warn_antiporn    INTEGER   DEFAULT 0,
    warn_estado      INTEGER   DEFAULT 0,

    -- Perfil
    edad             INTEGER,
    gender           TEXT,
    birthday         DATE,

    -- Economía / RPG
    money            INTEGER   DEFAULT 100,
    limite           INTEGER   DEFAULT 10,
    exp              INTEGER   DEFAULT 0,
    banco            INTEGER   DEFAULT 0,
    level            INTEGER   DEFAULT 0,
    role             TEXT      DEFAULT 'novato',

    -- Registro
    reg_time         TIMESTAMP,
    serial_number    TEXT,

    -- Stickers personalizados
    sticker_packname TEXT,
    sticker_author   TEXT,

    -- Cooldowns (timestamps en ms)
    ry_time          BIGINT    DEFAULT 0,
    lastwork         BIGINT    DEFAULT 0,
    lastmiming       BIGINT    DEFAULT 0,
    lastclaim        BIGINT    DEFAULT 0,
    dailystreak      BIGINT    DEFAULT 0,
    lastcofre        BIGINT    DEFAULT 0,
    lastrob          BIGINT    DEFAULT 0,
    lastslut         BIGINT    DEFAULT 0,
    timevot          BIGINT    DEFAULT 0,
    wait             BIGINT    DEFAULT 0,
    crime            BIGINT    DEFAULT 0,

    -- Pareja
    marry            TEXT,
    marry_request    TEXT
);

-- -----------------------------------------------------------
-- 2. GROUP_SETTINGS
-- Configuración por grupo de WhatsApp.
-- PK: group_id (JID del grupo, ej: 120363xxx@g.us)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_settings (
    group_id      TEXT PRIMARY KEY,

    -- Features toggle
    welcome       BOOLEAN   DEFAULT true,
    detect        BOOLEAN   DEFAULT true,
    antifake      BOOLEAN   DEFAULT false,
    antilink      BOOLEAN   DEFAULT false,
    antilink2     BOOLEAN   DEFAULT false,
    virustotal    BOOLEAN   DEFAULT false,
    modohorny     BOOLEAN   DEFAULT false,
    audios        BOOLEAN   DEFAULT false,
    "antiStatus"  BOOLEAN   DEFAULT false,
    modoadmin     BOOLEAN   DEFAULT false,
    photowelcome  BOOLEAN   DEFAULT false,
    photobye      BOOLEAN   DEFAULT false,
    autolevelup   BOOLEAN   DEFAULT true,
    antiporn      BOOLEAN   DEFAULT false,

    -- NSFW horario (formato "HH:MM-HH:MM")
    nsfw_horario  TEXT,

    -- Mensajes personalizados
    "sWelcome"    TEXT,
    "sBye"        TEXT,
    "sPromote"    TEXT,
    "sDemote"     TEXT,
    "sAutorespond" TEXT,

    -- Ban / expiración
    banned        BOOLEAN   DEFAULT false,
    expired       BIGINT    DEFAULT 0,

    -- Memoria IA (TTL en segundos, 0 = desactivada)
    memory_ttl    INTEGER   DEFAULT 86400,

    -- Bot primario del grupo
    primary_bot   TEXT,

    -- Solicitudes de ingreso al grupo
    autoaccept_mode TEXT DEFAULT 'off',

    -- Registro de mensajes del grupo
    message_logging BOOLEAN DEFAULT false
);

-- -----------------------------------------------------------
-- 3. CHATS
-- Registro de todos los chats (grupos y privados) donde
-- el bot ha interactuado.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS chats (
    id        TEXT PRIMARY KEY,
    is_group  BOOLEAN DEFAULT true,
    timestamp BIGINT,
    is_active BOOLEAN DEFAULT true,
    bot_id    TEXT,
    joined    BOOLEAN DEFAULT true
);

-- -----------------------------------------------------------
-- 4. MESSAGES
-- Contador de mensajes por usuario por grupo.
-- Usado para ranking, detección de fantasmas, etc.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    user_id       TEXT    NOT NULL,
    group_id      TEXT    NOT NULL,
    message_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, group_id)
);

-- -----------------------------------------------------------
-- 4.1 MESSAGE_LOGS
-- Registro opcional de mensajes por grupo.
-- Sólo conserva texto; multimedia se guarda como "Multimedia omitido."
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_logs (
    id           SERIAL PRIMARY KEY,
    group_id     TEXT      NOT NULL,
    user_id      TEXT      NOT NULL,
    message_id   TEXT      NOT NULL,
    message_text TEXT      NOT NULL,
    message_type TEXT      NOT NULL,
    is_reply     BOOLEAN   DEFAULT false,
    reply_to_message_id TEXT,
    is_deleted   BOOLEAN   DEFAULT false,
    deleted_at   TIMESTAMP,
    deleted_by   TEXT,
    deleted_by_lid TEXT,
    created_at   TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_logs_group_created_at_idx
    ON message_logs (group_id, created_at);

CREATE INDEX IF NOT EXISTS message_logs_group_message_id_idx
    ON message_logs (group_id, message_id);

CREATE INDEX IF NOT EXISTS message_logs_user_idx
    ON message_logs (user_id);

-- -----------------------------------------------------------
-- 5. SUBBOTS
-- Configuración de cada instancia del bot (principal + subbots).
-- PK: id (JID del bot sin puerto, ej: 5491112345678)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS subbots (
    id            TEXT PRIMARY KEY,
    tipo          TEXT      DEFAULT 'null',
    name          TEXT,
    logo_url      TEXT,
    prefix        TEXT[]    DEFAULT ARRAY['/', '.', '#'],
    mode          TEXT      DEFAULT 'public',
    owners        TEXT[],
    anti_private  BOOLEAN   DEFAULT false,
    anti_call     BOOLEAN   DEFAULT true,
    privacy       BOOLEAN   DEFAULT false,
    prestar       BOOLEAN   DEFAULT false
);

-- -----------------------------------------------------------
-- 6. CHARACTERS
-- Personajes del sistema gacha/RPG que los usuarios reclaman.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS characters (
    id                SERIAL PRIMARY KEY,
    name              TEXT    NOT NULL,
    url               TEXT    NOT NULL,
    tipo              TEXT,
    anime             TEXT,
    rareza            TEXT,
    price             INTEGER NOT NULL,
    previous_price    INTEGER,
    claimed_by        TEXT,
    for_sale          BOOLEAN DEFAULT false,
    seller            TEXT,
    votes             INTEGER DEFAULT 0,
    last_removed_time BIGINT
);

-- -----------------------------------------------------------
-- 7. REPORTES
-- Sistema de reportes y sugerencias de usuarios.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes (
    id          SERIAL PRIMARY KEY,
    sender_id   TEXT      NOT NULL,
    sender_name TEXT,
    mensaje     TEXT      NOT NULL,
    fecha       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enviado     BOOLEAN   DEFAULT false,
    tipo        TEXT      DEFAULT 'reporte'
);

-- -----------------------------------------------------------
-- 8. CHAT_MEMORY
-- Historial de conversación para el autoresponder con IA.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_memory (
    chat_id    TEXT PRIMARY KEY,
    history    JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------
-- 9. API_TOKENS
-- Tokens de APIs externas (Groq, etc.) en base64.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_tokens (
    name      TEXT PRIMARY KEY,
    token_b64 TEXT NOT NULL
);

-- -----------------------------------------------------------
-- 10. STATS
-- Contador de uso por comando.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS stats (
    command TEXT PRIMARY KEY,
    count   INTEGER DEFAULT 1
);

COMMIT;
