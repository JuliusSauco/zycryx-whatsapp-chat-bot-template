import {logError} from './logger.js';
import pg from 'pg';
import {ENV} from '../core/env.js';

export {invalidateSubbotConfig, invalidateGroupSettings} from './db-cache.js';

const {Pool} = pg;

const searchPathOptions = `-c search_path=pg_catalog,public,extensions -c statement_timeout=${ENV.DB_STATEMENT_TIMEOUT_MS} -c application_name=zycryx-bot`;

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

export const db = new Pool({
    ...poolConfig,
    max: ENV.DB_POOL_MAX,
    idleTimeoutMillis: ENV.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: ENV.DB_CONNECTION_TIMEOUT_MS,
});

db.on('error', err => {
    logError('[DB] Error inesperado en el pool de PostgreSQL:', err);
});
