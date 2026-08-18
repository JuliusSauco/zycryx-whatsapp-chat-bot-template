import {eq} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {encryptedSecrets, encryptionKeyVersions} from '../../db/schema.js';
import type {ApiTokenRepository} from '../../ports/repositories.js';
import {decryptBuffer, encryptBuffer, getConfiguredKdf} from '../../lib/secret-crypto.js';

const tokenAad = (name: string) => `secret:api-token:${name}`;

export const apiTokenRepository: ApiTokenRepository = {
    async findToken(name) {
        const [row] = await orm
            .select({
                keyVersion: encryptedSecrets.keyVersion,
                ciphertext: encryptedSecrets.ciphertext,
                iv: encryptedSecrets.iv,
                authTag: encryptedSecrets.authTag,
            })
            .from(encryptedSecrets)
            .where(eq(encryptedSecrets.name, name))
            .limit(1);
        if (!row) return null;
        return (await decryptBuffer(row, tokenAad(name))).toString('utf8').trim();
    },

    async upsertToken(name, token) {
        const payload = await encryptBuffer(Buffer.from(token.trim(), 'utf8'), tokenAad(name));
        await orm.insert(encryptionKeyVersions).values({version: payload.keyVersion, kdf: getConfiguredKdf()})
            .onConflictDoNothing();
        await orm.insert(encryptedSecrets).values({name, purpose: 'api-token', ...payload})
            .onConflictDoUpdate({
                target: encryptedSecrets.name,
                set: {...payload, purpose: 'api-token', updatedAt: new Date()},
            });
    },
};
