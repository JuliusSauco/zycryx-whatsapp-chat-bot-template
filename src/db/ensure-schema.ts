import pg from 'pg';
import {ENV} from '../core/env.js';
import {logInfo} from '../lib/logger.js';

const {Client} = pg;
const REQUIRED_SCHEMAS = [
    'bot_identity', 'bot_economy', 'bot_groups', 'bot_runtime',
    'bot_content', 'bot_ai', 'bot_audit', 'bot_security', 'bot_sessions',
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
    logInfo(`[DB] PostgreSQL ${versionNumber}; schemas normalizados disponibles.`);
} finally {
    await client.end();
}
