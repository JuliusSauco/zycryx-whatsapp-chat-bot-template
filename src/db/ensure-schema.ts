import {logError, logInfo, logWarn} from '../lib/logger.js';
import pg from 'pg';
import '../core/env.js';

const {Client} = pg;

function normalizeIdentifier(value: string, fallback: string): string {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) ? value : fallback;
}

const schema = normalizeIdentifier(process.env.DB_SCHEMA || 'public', 'public');

const client = new Client(
    process.env.DATABASE_URL
        ? {connectionString: process.env.DATABASE_URL}
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT || 5432),
            database: process.env.DB_NAME || 'zycryx_bot',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
        },
);

try {
    await client.connect();
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(`ALTER TABLE IF EXISTS ${schema}.group_settings ADD COLUMN IF NOT EXISTS virustotal BOOLEAN DEFAULT false`);
    logInfo(`[DB] Schema listo: ${schema}`);
} finally {
    await client.end();
}
