import pg from 'pg';
import {ENV} from '../core/env.js';
import {logInfo} from '../lib/logger.js';

const {Client} = pg;
const REQUIRED_SCHEMAS = [
    'bot_identity', 'bot_economy', 'bot_groups', 'bot_runtime',
    'bot_content', 'bot_ai', 'bot_audit', 'bot_security', 'bot_sessions',
] as const;
const REQUIRED_RELATIONS = [
    'bot_runtime.bot_instances',
    'bot_sessions.auth_sessions',
    'bot_sessions.auth_credentials',
    'bot_sessions.signal_keys',
    'bot_security.encryption_key_versions',
    'bot_security.encrypted_secrets',
    'bot_runtime.report_deliveries',
] as const;
const REQUIRED_INDEXES = [
    'bot_runtime.bot_instances_type_status_idx',
    'bot_runtime.bot_instances_bot_jid_uidx',
    'bot_sessions.auth_sessions_lease_idx',
    'bot_sessions.auth_sessions_bot_instance_uidx',
    'bot_sessions.signal_keys_session_type_idx',
    'bot_groups.group_settings_primary_bot_idx',
    'bot_runtime.report_deliveries_pending_idx',
] as const;
const client = new Client(ENV.DATABASE_URL
    ? {connectionString: ENV.DATABASE_URL}
    : {
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        database: ENV.DB_NAME,
        user: ENV.DB_USER,
        password: ENV.DB_PASSWORD,
    });

try {
    await client.connect();
    const [versionResult, schemasResult] = await Promise.all([
        client.query<{versionNumber: number}>(
            `SELECT current_setting('server_version_num')::integer AS "versionNumber"`,
        ),
        client.query<{schemaName: string}>(
            `SELECT schema_name AS "schemaName"
             FROM information_schema.schemata
             WHERE schema_name = ANY($1::text[])`,
            [REQUIRED_SCHEMAS],
        ),
    ]);
    const versionNumber = versionResult.rows[0]?.versionNumber ?? 0;
    if (versionNumber < 180000) {
        throw new Error(`PostgreSQL 18 o superior es obligatorio; el servidor reporta ${versionNumber}.`);
    }
    const present = new Set(schemasResult.rows.map(row => row.schemaName));
    const missing = REQUIRED_SCHEMAS.filter(schema => !present.has(schema));
    if (missing.length) {
        throw new Error(`Base sin inicializar. Faltan schemas: ${missing.join(', ')}. Ejecuta npm run db:setup.`);
    }
    const relationResult = await client.query<{relation: string | null}>(
        `SELECT to_regclass(item)::text AS relation FROM unnest($1::text[]) item`,
        [REQUIRED_RELATIONS],
    );
    const missingRelations = REQUIRED_RELATIONS.filter(required =>
        !relationResult.rows.some(row => row.relation === required));
    if (missingRelations.length) throw new Error(`Faltan tablas críticas: ${missingRelations.join(', ')}.`);

    const indexResult = await client.query<{schemaName: string; indexName: string}>(
        `SELECT schemaname AS "schemaName", indexname AS "indexName"
         FROM pg_indexes WHERE (schemaname || '.' || indexname) = ANY($1::text[])`,
        [REQUIRED_INDEXES],
    );
    const presentIndexes = new Set(indexResult.rows.map(row => `${row.schemaName}.${row.indexName}`));
    const missingIndexes = REQUIRED_INDEXES.filter(index => !presentIndexes.has(index));
    if (missingIndexes.length) throw new Error(`Faltan índices críticos: ${missingIndexes.join(', ')}.`);

    logInfo(`[DB] PostgreSQL ${versionNumber}; ${REQUIRED_SCHEMAS.length} schemas, relaciones e índices críticos verificados.`);
} finally {
    await client.end();
}
