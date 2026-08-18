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
    'bot_economy.resources',
    'bot_economy.store_products',
    'bot_economy.user_product_subscriptions',
    'bot_economy.raffle_tickets',
    'bot_groups.group_daily_reminder_deliveries',
] as const;
const REQUIRED_INDEXES = [
    'bot_runtime.bot_instances_type_status_idx',
    'bot_runtime.bot_instances_bot_jid_uidx',
    'bot_sessions.auth_sessions_lease_idx',
    'bot_sessions.auth_sessions_bot_instance_uidx',
    'bot_sessions.signal_keys_session_type_idx',
    'bot_groups.group_settings_primary_bot_idx',
    'bot_runtime.report_deliveries_pending_idx',
    'bot_economy.user_product_subscriptions_due_idx',
    'bot_economy.raffle_tickets_status_purchased_idx',
    'bot_groups.group_daily_reminder_deliveries_day_status_idx',
] as const;
const REQUIRED_COLUMNS = [
    'bot_identity.user_profiles.gender',
    'bot_identity.user_profiles.nationality',
    'bot_identity.user_profiles.birthday',
] as const;
const REQUIRED_PROFILE_GENDERS = ['Masculino', 'Femenino', 'No Binario', 'Otro'] as const;
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

    const columnResult = await client.query<{qualifiedColumn: string}>(
        `SELECT table_schema || '.' || table_name || '.' || column_name AS "qualifiedColumn"
         FROM information_schema.columns
         WHERE table_schema || '.' || table_name || '.' || column_name = ANY($1::text[])`,
        [REQUIRED_COLUMNS],
    );
    const presentColumns = new Set(columnResult.rows.map(row => row.qualifiedColumn));
    const missingColumns = REQUIRED_COLUMNS.filter(column => !presentColumns.has(column));
    if (missingColumns.length) throw new Error(`Faltan columnas críticas: ${missingColumns.join(', ')}.`);

    const genderEnumResult = await client.query<{label: string}>(
        `SELECT enumlabel AS label
         FROM pg_enum
         INNER JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
         INNER JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
         WHERE pg_namespace.nspname = 'bot_identity' AND pg_type.typname = 'profile_gender'
         ORDER BY enumsortorder`,
    );
    const genderValues = genderEnumResult.rows.map(row => row.label);
    if (genderValues.length !== REQUIRED_PROFILE_GENDERS.length
        || genderValues.some((value, index) => value !== REQUIRED_PROFILE_GENDERS[index])) {
        throw new Error(`ENUM bot_identity.profile_gender inválido: ${genderValues.join(', ') || 'no existe'}.`);
    }

    const indexResult = await client.query<{schemaName: string; indexName: string}>(
        `SELECT schemaname AS "schemaName", indexname AS "indexName"
         FROM pg_indexes WHERE (schemaname || '.' || indexname) = ANY($1::text[])`,
        [REQUIRED_INDEXES],
    );
    const presentIndexes = new Set(indexResult.rows.map(row => `${row.schemaName}.${row.indexName}`));
    const missingIndexes = REQUIRED_INDEXES.filter(index => !presentIndexes.has(index));
    if (missingIndexes.length) throw new Error(`Faltan índices críticos: ${missingIndexes.join(', ')}.`);

    logInfo(`[DB] PostgreSQL ${versionNumber}; schemas, relaciones, columnas e índices críticos verificados.`);
} finally {
    await client.end();
}
