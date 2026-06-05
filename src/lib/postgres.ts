import {logError, logInfo, logWarn} from './logger.js';
import pg from 'pg';
import {ENV} from '../core/env.js';

export {invalidateSubbotConfig, invalidateGroupSettings} from './db-cache.js';

const {Pool} = pg;

function normalizeIdentifier(value: string, fallback: string): string {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) ? value : fallback;
}

const schema = normalizeIdentifier(ENV.DB_SCHEMA, 'public');
const searchPathOptions = `-c search_path=${schema}`;

const poolConfig = ENV.DATABASE_URL
    ? {connectionString: ENV.DATABASE_URL, options: searchPathOptions}
    : {
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        database: ENV.DB_NAME,
        user: ENV.DB_USER,
        password: ENV.DB_PASSWORD,
        options: searchPathOptions,
    };

export const db = new Pool({...poolConfig, max: 20});

db.on('error', err => {
    logError('[DB] Error inesperado en el pool de PostgreSQL:', err);
});
