import pg from 'pg';
import '../src/core/env.js';
import {logInfo} from '../src/lib/logger.js';

const {Client} = pg;
const adminUrl = process.env.DB_ADMIN_URL?.trim();
const roleName = (process.env.DB_RUNTIME_ROLE || 'zycryx_bot_app').trim();
const rolePassword = process.env.DB_RUNTIME_PASSWORD || '';
const schemas = [
    'bot_identity', 'bot_economy', 'bot_groups', 'bot_runtime', 'bot_content',
    'bot_ai', 'bot_audit', 'bot_security', 'bot_sessions',
];

if (!adminUrl) throw new Error('DB_ADMIN_URL es obligatorio para aprovisionar el rol runtime.');
if (!/^[a-z_][a-z0-9_]{0,62}$/i.test(roleName)) throw new Error('DB_RUNTIME_ROLE no es un identificador PostgreSQL válido.');
if (rolePassword.length < 20) throw new Error('DB_RUNTIME_PASSWORD debe tener al menos 20 caracteres.');

const client = new Client({connectionString: adminUrl});
await client.connect();

try {
    const quoted = await client.query<{role: string; password: string}>(
        `SELECT quote_ident($1) AS role, quote_literal($2) AS password`,
        [roleName, rolePassword],
    );
    const role = quoted.rows[0]?.role;
    const password = quoted.rows[0]?.password;
    if (!role || !password) throw new Error('No se pudo escapar el rol runtime.');

    await client.query('BEGIN');
    const exists = await client.query<{exists: boolean}>(
        `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists`,
        [roleName],
    );
    await client.query(exists.rows[0]?.exists
        ? `ALTER ROLE ${role} LOGIN PASSWORD ${password} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`
        : `CREATE ROLE ${role} LOGIN PASSWORD ${password} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    await client.query(`GRANT CONNECT ON DATABASE ${await currentDatabaseIdentifier(client)} TO ${role}`);

    for (const schemaName of schemas) {
        const schema = await quoteIdentifier(client, schemaName);
        await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
        await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role}`);
        await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role}`);
        await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`);
        await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${schema} GRANT USAGE, SELECT ON SEQUENCES TO ${role}`);
    }

    const tables = await client.query<{schemaname: string; tablename: string}>(
        `SELECT schemaname, tablename
         FROM pg_tables
         WHERE schemaname = ANY($1::text[])
         ORDER BY schemaname, tablename`,
        [schemas],
    );
    for (const table of tables.rows) {
        const schema = await quoteIdentifier(client, table.schemaname);
        const tableName = await quoteIdentifier(client, table.tablename);
        const policyExists = await client.query<{exists: boolean}>(
            `SELECT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = $1 AND tablename = $2 AND policyname = 'zycryx_runtime_access'
            ) AS exists`,
            [table.schemaname, table.tablename],
        );
        if (!policyExists.rows[0]?.exists) {
            await client.query(
                `CREATE POLICY zycryx_runtime_access ON ${schema}.${tableName}
                 TO ${role} USING (true) WITH CHECK (true)`,
            );
        } else {
            await client.query(`ALTER POLICY zycryx_runtime_access ON ${schema}.${tableName} TO ${role}`);
        }
    }

    await client.query(`REVOKE ALL ON bot_runtime.schema_migrations FROM ${role}`).catch(() => undefined);
    await client.query('COMMIT');
    logInfo(`[DB] Rol runtime ${roleName} aprovisionado sobre ${tables.rowCount ?? 0} tablas.`);
} catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
} finally {
    await client.end();
}

async function quoteIdentifier(clientInstance: pg.Client, value: string): Promise<string> {
    const result = await clientInstance.query<{quoted: string}>(`SELECT quote_ident($1) AS quoted`, [value]);
    const quoted = result.rows[0]?.quoted;
    if (!quoted) throw new Error(`No se pudo escapar el identificador ${value}.`);
    return quoted;
}

async function currentDatabaseIdentifier(clientInstance: pg.Client): Promise<string> {
    const result = await clientInstance.query<{quoted: string}>(`SELECT quote_ident(current_database()) AS quoted`);
    const quoted = result.rows[0]?.quoted;
    if (!quoted) throw new Error('No se pudo determinar la base actual.');
    return quoted;
}
