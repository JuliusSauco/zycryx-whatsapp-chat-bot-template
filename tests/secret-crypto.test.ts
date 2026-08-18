import assert from 'node:assert/strict';

process.env.BOT_SECRETS_KEY_VERSION = '1';
process.env.BOT_SECRETS_MASTER_KEY_B64 = Buffer.alloc(32, 7).toString('base64');
delete process.env.BOT_SECRETS_PASSPHRASE;

const {decryptBuffer, decryptJson, encryptBuffer, encryptJson} = await import('../src/lib/secret-crypto.js');

const encrypted = await encryptBuffer(Buffer.from('super-secret'), 'test:aad');
assert.notEqual(encrypted.ciphertext.toString('utf8'), 'super-secret');
assert.equal((await decryptBuffer(encrypted, 'test:aad')).toString('utf8'), 'super-secret');
await assert.rejects(() => decryptBuffer(encrypted, 'test:wrong-aad'));

const json = {buffer: Buffer.from([1, 2, 3]), nested: {ok: true}};
const encryptedJson = await encryptJson(json, 'test:json');
const restored = await decryptJson<typeof json>(encryptedJson, 'test:json');
assert.deepEqual(restored, json);

const startedAt = performance.now();
for (let index = 0; index < 1_000; index++) {
    const payload = await encryptBuffer(Buffer.alloc(2_048, index % 255), `perf:${index}`);
    await decryptBuffer(payload, `perf:${index}`);
}
const elapsedMs = performance.now() - startedAt;
assert.ok(elapsedMs < 2_000, `AES-GCM demasiado lento en test local: ${elapsedMs.toFixed(1)}ms`);

console.log(`secret-crypto.test.ts OK (${elapsedMs.toFixed(1)}ms para 1000 round-trips de 2KB)`);
