import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {ENV} from '../src/core/env.js';
import {logInfo} from '../src/lib/logger.js';

const {Client} = pg;
const schemaPath = fileURLToPath(new URL('../database/schema.sql', import.meta.url));
const sql = await readFile(schemaPath, 'utf8');
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
    await client.query(sql);
    logInfo('[DB] Base PostgreSQL 18 creada desde database/schema.sql.');
} finally {
    await client.end();
}
