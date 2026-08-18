import {db} from '../src/lib/postgres.js';
import {getDecodedApiToken, invalidateApiTokenCache, setEncryptedApiToken} from '../src/services/api-token.service.js';
import {getEncryptionKey} from '../src/lib/secret-crypto.js';
import {logInfo} from '../src/lib/logger.js';

try {
    await getEncryptionKey();
    const exists = await db.query<{tableName: string | null}>(
        `SELECT to_regclass('bot_runtime.api_tokens')::text AS "tableName"`,
    );
    if (!exists.rows[0]?.tableName) {
        logInfo('[SECRETS] No existe la tabla legacy bot_runtime.api_tokens.');
    } else {
        const legacy = await db.query<{name: string; tokenB64: string}>(
            `SELECT name, token_b64 AS "tokenB64" FROM bot_runtime.api_tokens ORDER BY name`,
        );
        for (const row of legacy.rows) {
            const normalized = row.tokenB64.trim();
            if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
                throw new Error(`El token legacy '${row.name}' no es base64 válido.`);
            }
            const token = Buffer.from(normalized, 'base64').toString('utf8').trim();
            if (!token) throw new Error(`El token legacy '${row.name}' está vacío.`);
            await setEncryptedApiToken(row.name, token);
            invalidateApiTokenCache(row.name);
            if (await getDecodedApiToken(row.name) !== token) {
                throw new Error(`Falló la verificación de cifrado para '${row.name}'.`);
            }
        }

        await db.query('DROP TABLE bot_runtime.api_tokens');
        logInfo(`[SECRETS] ${legacy.rowCount ?? legacy.rows.length} tokens migrados a AES-256-GCM; tabla base64 eliminada.`);
    }
} finally {
    await db.end();
}
