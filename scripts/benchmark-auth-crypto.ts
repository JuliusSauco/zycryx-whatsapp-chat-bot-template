import {argon2Sync, createCipheriv, randomBytes} from 'node:crypto';

const argonStartedAt = performance.now();
argon2Sync('argon2id', {
    message: 'benchmark-passphrase-not-a-real-secret',
    nonce: randomBytes(16),
    parallelism: 4,
    tagLength: 32,
    memory: 65_536,
    passes: 3,
    associatedData: 'zycryx-secrets-v1',
});
const argonMs = performance.now() - argonStartedAt;

const key = randomBytes(32);
const data = Buffer.alloc(2_048);
const iterations = 10_000;
const aesStartedAt = performance.now();
for (let index = 0; index < iterations; index++) {
    const cipher = createCipheriv('aes-256-gcm', key, randomBytes(12));
    cipher.setAAD(Buffer.from(`benchmark:${index}`));
    cipher.update(data);
    cipher.final();
    cipher.getAuthTag();
}
const aesMs = performance.now() - aesStartedAt;

console.log(JSON.stringify({
    argon2id_once_ms: Number(argonMs.toFixed(2)),
    aes_gcm_iterations: iterations,
    aes_gcm_payload_bytes: data.length,
    aes_gcm_total_ms: Number(aesMs.toFixed(2)),
    aes_gcm_average_ms: Number((aesMs / iterations).toFixed(5)),
}, null, 2));
