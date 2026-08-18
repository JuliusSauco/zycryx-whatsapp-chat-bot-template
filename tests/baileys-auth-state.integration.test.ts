import assert from 'node:assert/strict';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio para el test de integración.');
if (!process.env.BOT_SECRETS_MASTER_KEY_B64) throw new Error('BOT_SECRETS_MASTER_KEY_B64 es obligatorio para el test de integración.');
process.env.BAILEYS_AUTH_STATE_SOURCE = 'database';

const {useConfiguredAuthState} = await import('../src/services/baileys-auth-state.service.js');
const {getDecodedApiToken, invalidateApiTokenCache, setEncryptedApiToken} = await import('../src/services/api-token.service.js');
const {db} = await import('../src/lib/postgres.js');

const sessionId = `integration-${Date.now()}`;
let auth = await useConfiguredAuthState({sessionId, sessionType: 'subbot', ownerId: 'integration-owner'});
auth.state.creds.registered = true;
await auth.state.keys.set({
    'pre-key': {
        'key:1': {public: Uint8Array.from([1, 2, 3]), private: Uint8Array.from([4, 5, 6])},
    },
    'lid-mapping': {'lid/1': '573001112233@s.whatsapp.net'},
});
await auth.saveCreds();
await auth.flush();
await auth.dispose();

auth = await useConfiguredAuthState({sessionId, sessionType: 'subbot', ownerId: 'integration-owner'});
assert.equal(auth.state.creds.registered, true);
const preKeys = await auth.state.keys.get('pre-key', ['key:1']);
assert.deepEqual([...preKeys['key:1'].public], [1, 2, 3]);
const mappings = await auth.state.keys.get('lid-mapping', ['lid/1']);
assert.equal(mappings['lid/1'], '573001112233@s.whatsapp.net');

const hotReadStartedAt = performance.now();
for (let index = 0; index < 10_000; index++) {
    await auth.state.keys.get('pre-key', ['key:1']);
}
const hotReadMs = performance.now() - hotReadStartedAt;
assert.ok(hotReadMs < 500, `La lectura cacheada de auth fue demasiado lenta: ${hotReadMs.toFixed(1)}ms`);

await setEncryptedApiToken('integration-token', 'token-value');
invalidateApiTokenCache('integration-token');
assert.equal(await getDecodedApiToken('integration-token'), 'token-value');

await auth.deleteSession();
await db.query(`DELETE FROM bot_security.encrypted_secrets WHERE name = 'integration-token'`);
await db.end();

console.log(`baileys-auth-state.integration.test.ts OK (${hotReadMs.toFixed(1)}ms para 10k lecturas cacheadas)`);
