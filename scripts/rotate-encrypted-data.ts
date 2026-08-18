import {db} from '../src/lib/postgres.js';
import {decryptBuffer, encryptBuffer, getConfiguredKdf, getEncryptionKey} from '../src/lib/secret-crypto.js';
import {ENV} from '../src/core/env.js';
import {logInfo} from '../src/lib/logger.js';
import type {EncryptedPayload} from '../src/lib/secret-crypto.js';

type SecretRow = EncryptedPayload & {name: string; purpose: string};
type CredentialsRow = EncryptedPayload & {sessionId: string};
type SignalRow = EncryptedPayload & {sessionId: string; keyType: string; keyId: string};
type Rotated<T> = T & {rotated: EncryptedPayload};

await getEncryptionKey(ENV.BOT_SECRETS_KEY_VERSION);
const client = await db.connect();

try {
    const secretResult = await client.query<SecretRow>(
        `SELECT name, purpose, key_version AS "keyVersion", ciphertext, iv, auth_tag AS "authTag"
         FROM bot_security.encrypted_secrets WHERE key_version <> $1 ORDER BY name`,
        [ENV.BOT_SECRETS_KEY_VERSION],
    );
    const credentialsResult = await client.query<CredentialsRow>(
        `SELECT session_id AS "sessionId", key_version AS "keyVersion", ciphertext, iv, auth_tag AS "authTag"
         FROM bot_sessions.auth_credentials WHERE key_version <> $1 ORDER BY session_id`,
        [ENV.BOT_SECRETS_KEY_VERSION],
    );
    const signalResult = await client.query<SignalRow>(
        `SELECT session_id AS "sessionId", key_type AS "keyType", key_id AS "keyId",
                key_version AS "keyVersion", ciphertext, iv, auth_tag AS "authTag"
         FROM bot_sessions.signal_keys WHERE key_version <> $1 ORDER BY session_id, key_type, key_id`,
        [ENV.BOT_SECRETS_KEY_VERSION],
    );

    const secrets: Rotated<SecretRow>[] = [];
    for (const row of secretResult.rows) {
        if (row.purpose !== 'api-token') throw new Error(`Purpose cifrado no soportado durante rotación: ${row.purpose}`);
        const aad = `secret:api-token:${row.name}`;
        const plaintext = await decryptBuffer(row, aad);
        secrets.push({...row, rotated: await encryptBuffer(plaintext, aad)});
    }

    const credentials: Rotated<CredentialsRow>[] = [];
    for (const row of credentialsResult.rows) {
        const aad = `baileys:${row.sessionId}:credentials`;
        const plaintext = await decryptBuffer(row, aad);
        credentials.push({...row, rotated: await encryptBuffer(plaintext, aad)});
    }

    const signalKeys: Rotated<SignalRow>[] = [];
    for (const row of signalResult.rows) {
        const aad = `baileys:${row.sessionId}:signal:${row.keyType}:${row.keyId}`;
        const plaintext = await decryptBuffer(row, aad);
        signalKeys.push({...row, rotated: await encryptBuffer(plaintext, aad)});
    }

    await client.query('BEGIN');
    await client.query(
        `INSERT INTO bot_security.encryption_key_versions (version, kdf, active)
         VALUES ($1, $2, true)
         ON CONFLICT (version) DO UPDATE SET kdf = excluded.kdf, active = true`,
        [ENV.BOT_SECRETS_KEY_VERSION, getConfiguredKdf()],
    );
    for (const row of secrets) {
        await client.query(
            `UPDATE bot_security.encrypted_secrets
             SET key_version = $2, ciphertext = $3, iv = $4, auth_tag = $5, updated_at = statement_timestamp()
             WHERE name = $1 AND key_version = $6`,
            [row.name, row.rotated.keyVersion, row.rotated.ciphertext, row.rotated.iv, row.rotated.authTag, row.keyVersion],
        );
    }
    for (const row of credentials) {
        await client.query(
            `UPDATE bot_sessions.auth_credentials
             SET key_version = $2, ciphertext = $3, iv = $4, auth_tag = $5, updated_at = statement_timestamp()
             WHERE session_id = $1 AND key_version = $6`,
            [row.sessionId, row.rotated.keyVersion, row.rotated.ciphertext, row.rotated.iv, row.rotated.authTag, row.keyVersion],
        );
    }
    for (const row of signalKeys) {
        await client.query(
            `UPDATE bot_sessions.signal_keys
             SET key_version = $4, ciphertext = $5, iv = $6, auth_tag = $7, updated_at = statement_timestamp()
             WHERE session_id = $1 AND key_type = $2 AND key_id = $3 AND key_version = $8`,
            [row.sessionId, row.keyType, row.keyId, row.rotated.keyVersion, row.rotated.ciphertext,
                row.rotated.iv, row.rotated.authTag, row.keyVersion],
        );
    }
    await client.query('COMMIT');
    logInfo(`[SECRETS] Rotación a versión ${ENV.BOT_SECRETS_KEY_VERSION}: ${secrets.length} secretos, ${credentials.length} credenciales y ${signalKeys.length} Signal keys.`);
} catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
} finally {
    client.release();
    await db.end();
}
