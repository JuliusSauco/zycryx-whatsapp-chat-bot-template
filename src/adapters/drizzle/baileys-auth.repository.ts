import {and, eq, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    baileysAuthCredentials,
    baileysAuthSessions,
    baileysSignalKeys,
    botInstances,
    encryptionKeyVersions,
} from '../../db/schema.js';
import type {
    BaileysAuthRepository,
    SignalKeyChange,
} from '../../ports/baileys-auth.repository.js';
import {db} from '../../lib/postgres.js';

export const baileysAuthRepository: BaileysAuthRepository = {
    async ensureEncryptionKeyVersion(version, kdf) {
        await orm.insert(encryptionKeyVersions).values({version, kdf})
            .onConflictDoUpdate({
                target: encryptionKeyVersions.version,
                set: {active: true, retiredAt: null, kdf},
            });
    },

    async ensureSession({sessionId, botInstanceId, type, ownerId}) {
        await orm.transaction(async tx => {
            await tx.insert(botInstances).values({id: botInstanceId, instanceType: type})
                .onConflictDoUpdate({
                    target: botInstances.id,
                    set: {instanceType: type, updatedAt: new Date()},
                });
            await tx.insert(baileysAuthSessions).values({sessionId, botInstanceId, ownerId}).onConflictDoUpdate({
                target: baileysAuthSessions.sessionId,
                set: {botInstanceId, ...(ownerId ? {ownerId} : {}), updatedAt: new Date()},
            });
        });
    },

    async acquireLease(sessionId, leaseOwner, leaseSeconds) {
        const result = await db.query(
            `UPDATE bot_sessions.auth_sessions
             SET lease_owner = $2,
                 lease_expires_at = statement_timestamp() + make_interval(secs => $3),
                 updated_at = statement_timestamp()
             WHERE session_id = $1
               AND (lease_owner = $2 OR lease_expires_at IS NULL OR lease_expires_at < statement_timestamp())
             RETURNING session_id`,
            [sessionId, leaseOwner, leaseSeconds],
        );
        return result.rowCount === 1;
    },

    async renewLease(sessionId, leaseOwner, leaseSeconds) {
        const result = await db.query(
            `UPDATE bot_sessions.auth_sessions
             SET lease_expires_at = statement_timestamp() + make_interval(secs => $3),
                 updated_at = statement_timestamp()
             WHERE session_id = $1 AND lease_owner = $2 AND lease_expires_at >= statement_timestamp()
             RETURNING session_id`,
            [sessionId, leaseOwner, leaseSeconds],
        );
        return result.rowCount === 1;
    },

    async releaseLease(sessionId, leaseOwner) {
        await db.query(
            `UPDATE bot_sessions.auth_sessions
             SET lease_owner = NULL, lease_expires_at = NULL, updated_at = statement_timestamp()
             WHERE session_id = $1 AND lease_owner = $2`,
            [sessionId, leaseOwner],
        );
    },

    async hasCredentials(sessionId) {
        const [row] = await orm.select({sessionId: baileysAuthCredentials.sessionId})
            .from(baileysAuthCredentials)
            .where(eq(baileysAuthCredentials.sessionId, sessionId))
            .limit(1);
        return Boolean(row);
    },

    async loadCredentials(sessionId) {
        const [row] = await orm.select({
            keyVersion: baileysAuthCredentials.keyVersion,
            ciphertext: baileysAuthCredentials.ciphertext,
            iv: baileysAuthCredentials.iv,
            authTag: baileysAuthCredentials.authTag,
        }).from(baileysAuthCredentials)
            .where(eq(baileysAuthCredentials.sessionId, sessionId))
            .limit(1);
        return row ?? null;
    },

    async listSignalKeys(sessionId) {
        return orm.select({
            keyType: baileysSignalKeys.keyType,
            keyId: baileysSignalKeys.keyId,
            keyVersion: baileysSignalKeys.keyVersion,
            ciphertext: baileysSignalKeys.ciphertext,
            iv: baileysSignalKeys.iv,
            authTag: baileysSignalKeys.authTag,
        }).from(baileysSignalKeys)
            .where(eq(baileysSignalKeys.sessionId, sessionId));
    },

    async saveCredentials(sessionId, payload) {
        await orm.insert(baileysAuthCredentials).values({sessionId, ...payload})
            .onConflictDoUpdate({
                target: baileysAuthCredentials.sessionId,
                set: {...payload, updatedAt: new Date()},
            });
    },

    async applySignalKeyChanges(sessionId, changes) {
        if (!changes.length) return;
        await orm.transaction(async tx => {
            const removals = changes.filter((change): change is SignalKeyChange & {payload: null} => !change.payload);
            const upserts = changes.filter((change): change is SignalKeyChange & {payload: NonNullable<SignalKeyChange['payload']>} => Boolean(change.payload));

            for (const change of removals) {
                await tx.delete(baileysSignalKeys).where(and(
                    eq(baileysSignalKeys.sessionId, sessionId),
                    eq(baileysSignalKeys.keyType, change.keyType),
                    eq(baileysSignalKeys.keyId, change.keyId),
                ));
            }
            if (upserts.length) {
                await tx.insert(baileysSignalKeys).values(upserts.map(change => ({
                    sessionId,
                    keyType: change.keyType,
                    keyId: change.keyId,
                    ...change.payload,
                }))).onConflictDoUpdate({
                    target: [baileysSignalKeys.sessionId, baileysSignalKeys.keyType, baileysSignalKeys.keyId],
                    set: {
                        keyVersion: sql`excluded.key_version`,
                        ciphertext: sql`excluded.ciphertext`,
                        iv: sql`excluded.iv`,
                        authTag: sql`excluded.auth_tag`,
                        updatedAt: new Date(),
                    },
                });
            }
        });
    },

    async listActiveSessionIds(type) {
        const rows = await orm.select({id: baileysAuthSessions.sessionId})
            .from(baileysAuthSessions)
            .innerJoin(botInstances, eq(baileysAuthSessions.botInstanceId, botInstances.id))
            .where(and(
                eq(botInstances.instanceType, type),
                eq(botInstances.status, 'active'),
            ));
        return rows.map(row => row.id);
    },

    async markConnected(sessionId, botJid) {
        await orm.update(botInstances).set({
            botJid,
            status: 'active',
            lastConnectedAt: new Date(),
            updatedAt: new Date(),
        }).where(eq(botInstances.id, sql`(
            SELECT ${baileysAuthSessions.botInstanceId}
            FROM ${baileysAuthSessions}
            WHERE ${baileysAuthSessions.sessionId} = ${sessionId}
        )`));
    },

    async markError(sessionId) {
        await orm.update(botInstances).set({status: 'error', updatedAt: new Date()})
            .where(eq(botInstances.id, sql`(
                SELECT ${baileysAuthSessions.botInstanceId}
                FROM ${baileysAuthSessions}
                WHERE ${baileysAuthSessions.sessionId} = ${sessionId}
            )`));
    },

    async deleteSession(sessionId) {
        await orm.transaction(async tx => {
            await tx.update(botInstances).set({status: 'revoked', updatedAt: new Date()})
                .where(eq(botInstances.id, sql`(
                    SELECT ${baileysAuthSessions.botInstanceId}
                    FROM ${baileysAuthSessions}
                    WHERE ${baileysAuthSessions.sessionId} = ${sessionId}
                )`));
            await tx.delete(baileysAuthSessions).where(eq(baileysAuthSessions.sessionId, sessionId));
        });
    },
};
