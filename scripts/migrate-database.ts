import {createHash} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {ENV} from '../src/core/env.js';
import {logInfo} from '../src/lib/logger.js';

const {Client} = pg;
const migrationsDir = fileURLToPath(new URL('../database/migrations', import.meta.url));
const client = new Client(ENV.DATABASE_URL
    ? {connectionString: ENV.DATABASE_URL}
    : {host: ENV.DB_HOST, port: ENV.DB_PORT, database: ENV.DB_NAME, user: ENV.DB_USER, password: ENV.DB_PASSWORD});

await client.connect();
try {
    await client.query('SELECT pg_advisory_lock($1)', [8_219_447_331]);
    await client.query(`
        CREATE TABLE IF NOT EXISTS bot_runtime.schema_migrations (
            name text PRIMARY KEY,
            checksum text NOT NULL,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
    `);

    const files = (await readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort();
    for (const file of files) {
        const sql = await readFile(path.join(migrationsDir, file), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        const existing = await client.query<{checksum: string}>(
            'SELECT checksum FROM bot_runtime.schema_migrations WHERE name = $1',
            [file],
        );
        if (existing.rows[0]) {
            if (existing.rows[0].checksum !== checksum) throw new Error(`La migración aplicada ${file} cambió de contenido.`);
            continue;
        }

        await client.query('BEGIN');
        try {
            await client.query(sql);
            await client.query(
                'INSERT INTO bot_runtime.schema_migrations (name, checksum) VALUES ($1, $2)',
                [file, checksum],
            );
            await client.query('COMMIT');
            logInfo(`[DB] Migración aplicada: ${file}`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }
} finally {
    await client.query('SELECT pg_advisory_unlock($1)', [8_219_447_331]).catch(() => undefined);
    await client.end();
}
