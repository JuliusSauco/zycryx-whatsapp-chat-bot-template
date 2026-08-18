import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'drizzle-kit';

const env = process.env.NODE_ENV || 'local';
const envFile = path.resolve(`.env.${env}`);

if (fs.existsSync(envFile)) {
    dotenv.config({path: envFile});
} else {
    dotenv.config();
}

const domainSchemas = [
    'bot_identity',
    'bot_economy',
    'bot_groups',
    'bot_runtime',
    'bot_content',
    'bot_ai',
    'bot_audit',
    'bot_security',
    'bot_sessions',
];

function buildConnectionUrl(): string {
    const searchPath = encodeURIComponent('-c search_path=pg_catalog,public,extensions');
    if (process.env.DATABASE_URL) {
        const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
        return `${process.env.DATABASE_URL}${separator}options=${searchPath}`;
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || 5432);
    const database = process.env.DB_NAME || 'zycryx_bot';
    const user = encodeURIComponent(process.env.DB_USER || 'postgres');
    const password = encodeURIComponent(process.env.DB_PASSWORD || '');
    return `postgresql://${user}:${password}@${host}:${port}/${database}?options=${searchPath}`;
}

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './database/migrations',
    dialect: 'postgresql',
    schemaFilter: domainSchemas,
    dbCredentials: {url: buildConnectionUrl()},
});
