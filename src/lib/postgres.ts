import {logError} from './logger.js';
import pg from 'pg';
import {ENV} from '../core/env.js';

export {invalidateSubbotConfig, invalidateGroupSettings} from './db-cache.js';

const {Pool} = pg;

const searchPathOptions = '-c search_path=bot_identity,bot_economy,bot_groups,bot_runtime,bot_content,bot_ai,bot_audit,public,extensions';

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
