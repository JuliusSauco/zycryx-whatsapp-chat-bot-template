import {and, eq, inArray, ne, sql} from 'drizzle-orm';
import {alias} from 'drizzle-orm/pg-core';
import {orm} from '../../db/client.js';
import {
    marriageMembers, marriageRequests, marriages, userBans, userCooldowns,
    userDailyRewards, userIdentities, userPrivateChatStates, userProfiles, userProgress,
    userRegistrations, userStickerPreferences, userWarnings, usuarios,
} from '../../db/schema.js';
import type {UserRepository} from '../../ports/repositories.js';
import {walletUserRepositoryMethods} from './user-wallet.repository.js';
import {mapUserRecord} from './user.mapper.js';
import {createFinancialOperation, ensureUserAccounts, getAccountId, insertLedgerEntries, lockBalances, updateBalance} from './economy-account.helpers.js';

type Transaction = Parameters<Parameters<typeof orm.transaction>[0]>[0];

const identityValue = (type: 'phone' | 'lid' | 'username') => sql<string | null>`(
    SELECT identity_value FROM bot_identity.user_identities
    WHERE user_id = ${usuarios.id} AND identity_type = ${type} LIMIT 1
)`;

const warningCount = (type: 'general' | 'antiporn' | 'status') => sql<number>`COALESCE((
    SELECT count FROM bot_identity.user_warnings
    WHERE user_id = ${usuarios.id} AND warning_type = ${type}
), 0)`;

const cooldownMillis = (action: string) => sql<number>`COALESCE((
    SELECT EXTRACT(EPOCH FROM last_used_at) * 1000 FROM bot_identity.user_cooldowns
    WHERE user_id = ${usuarios.id} AND action = ${action}
), 0)::bigint`.mapWith(Number);

async function ensureEconomyRows(tx: Transaction, userId: string, operation: string): Promise<void> {
    await ensureUserAccounts(tx, userId, operation);
    await tx.insert(userProgress).values({userId}).onConflictDoNothing();
}

const walletBalance = (resource: string) => sql<number>`COALESCE((
    SELECT b.balance FROM bot_economy.financial_accounts a
    JOIN bot_economy.account_balances b ON b.account_id = a.id
    WHERE a.user_id = ${usuarios.id} AND a.account_type = 'wallet' AND b.resource_code = ${resource}
), 0)::bigint`.mapWith(Number);

async function replaceIdentity(
    tx: Transaction,
    userId: string,
    identityType: 'phone' | 'lid' | 'username',
    value: string | null | undefined,
): Promise<void> {
    if (value === undefined) return;
    await tx.delete(userIdentities).where(and(
        eq(userIdentities.userId, userId), eq(userIdentities.identityType, identityType),
    ));
    if (value) await tx.insert(userIdentities).values({
        userId, identityType, identityValue: value, updatedAt: new Date(),
    }).onConflictDoNothing();
}

export const userRepository: UserRepository = {
    async findById(userId) {
        const [row] = await orm.select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            username: identityValue('username'),
            registered: sql<boolean>`${userRegistrations.userId} IS NOT NULL`,
            num: identityValue('phone'),
            lid: identityValue('lid'),
            banned: sql<boolean>`${userBans.userId} IS NOT NULL`,
            razonBan: userBans.reason,
            avisosBan: userBans.noticeCount,
            warnPv: userPrivateChatStates.warned,
            warn: warningCount('general'),
            warnAntiporn: warningCount('antiporn'),
            warnEstado: warningCount('status'),
            edad: sql<number | null>`CASE WHEN ${userProfiles.birthday} IS NULL THEN NULL ELSE EXTRACT(YEAR FROM age(current_date, ${userProfiles.birthday}))::int END`,
            gender: userProfiles.gender,
            birthday: userProfiles.birthday,
            level: userProgress.level,
            role: userProgress.role,
            roleDescription: userProgress.roleDescription,
            regTime: userRegistrations.registeredAt,
            serialNumber: userRegistrations.serialNumber,
            stickerPackname: userStickerPreferences.packname,
            stickerAuthor: userStickerPreferences.author,
            ryTime: cooldownMillis('ryTime'),
            lastwork: cooldownMillis('lastwork'),
            lastmiming: cooldownMillis('lastmiming'),
            lastclaim: cooldownMillis('lastclaim'),
            dailystreak: userDailyRewards.streak,
            lastcofre: cooldownMillis('lastcofre'),
            lastrob: cooldownMillis('lastrob'),
            lastslut: cooldownMillis('lastslut'),
            timevot: cooldownMillis('timevot'),
            wait: cooldownMillis('wait'),
            crime: cooldownMillis('crime'),
            marry: sql<string | null>`(
                SELECT other.user_id FROM bot_identity.marriage_members own
                JOIN bot_identity.marriage_members other
                  ON other.marriage_id = own.marriage_id AND other.user_id <> own.user_id
                WHERE own.user_id = ${usuarios.id} LIMIT 1
            )`,
            marryRequest: sql<string | null>`(
                SELECT requester_id FROM bot_identity.marriage_requests
                WHERE recipient_id = ${usuarios.id} AND status = 'pending'
                ORDER BY created_at DESC LIMIT 1
            )`,
            limite: walletBalance('limite'),
            exp: walletBalance('exp'),
            coins: walletBalance('coins'),
            botcoin: walletBalance('botcoin'),
            zyxcoin: walletBalance('zyxcoin'),
        }).from(usuarios)
            .leftJoin(userProfiles, eq(userProfiles.userId, usuarios.id))
            .leftJoin(userRegistrations, eq(userRegistrations.userId, usuarios.id))
            .leftJoin(userBans, eq(userBans.userId, usuarios.id))
            .leftJoin(userPrivateChatStates, eq(userPrivateChatStates.userId, usuarios.id))
            .leftJoin(userProgress, eq(userProgress.userId, usuarios.id))
            .leftJoin(userStickerPreferences, eq(userStickerPreferences.userId, usuarios.id))
            .leftJoin(userDailyRewards, eq(userDailyRewards.userId, usuarios.id))
            .where(eq(usuarios.id, userId)).limit(1);
        return row ? mapUserRecord(row) : null;
    },

    async findNameById(userId) {
        const [row] = await orm.select({nombre: usuarios.nombre}).from(usuarios)
            .where(eq(usuarios.id, userId)).limit(1);
        return row?.nombre ?? null;
    },

    ...walletUserRepositoryMethods,

    async findBanInfo(userId) {
        const [user] = await orm.select({id: usuarios.id}).from(usuarios).where(eq(usuarios.id, userId)).limit(1);
        if (!user) return null;
        const [ban] = await orm.select().from(userBans).where(eq(userBans.userId, userId)).limit(1);
        return {banned: !!ban, razon_ban: ban?.reason ?? null, avisos_ban: ban?.noticeCount ?? 0};
    },

    async incrementBanNotice(userId, notices) {
        await orm.update(userBans).set({noticeCount: Math.max(0, notices)}).where(eq(userBans.userId, userId));
    },

    async setBanStatus(userId, banned, reason) {
        if (!banned) {
            await orm.delete(userBans).where(eq(userBans.userId, userId));
            return;
        }
        await orm.insert(userBans).values({userId, reason}).onConflictDoUpdate({
            target: userBans.userId, set: {reason, bannedAt: new Date()},
        });
    },

    async upsertBasicUser({id, nombre, username, num}) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({id, nombre}).onConflictDoUpdate({
                target: usuarios.id,
                set: {nombre: sql`CASE WHEN excluded.nombre IS NULL OR excluded.nombre = 'sin name' THEN ${usuarios.nombre} ELSE excluded.nombre END`, updatedAt: new Date()},
            });
            if (num) await tx.insert(userIdentities).values({userId: id, identityType: 'phone', identityValue: num}).onConflictDoNothing();
            if (username !== undefined) await replaceIdentity(tx, id, 'username', username);
            await ensureEconomyRows(tx, id, 'user_creation');
        });
    },

    async clearLidFromOtherUsers(lid, userId) {
        await orm.delete(userIdentities).where(and(
            eq(userIdentities.identityType, 'lid'), eq(userIdentities.identityValue, lid), ne(userIdentities.userId, userId),
        ));
    },

    async setUserLid(userId, lid) {
        await orm.transaction(tx => replaceIdentity(tx, userId, 'lid', lid));
    },

    async upsertRegisteredAdmin({id, nombre, num, lid, serialNumber}) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({id, nombre: nombre || id.split('@')[0]}).onConflictDoUpdate({
                target: usuarios.id,
                set: {nombre: sql`CASE
                    WHEN excluded.nombre IS NULL OR excluded.nombre = 'sin name' THEN ${usuarios.nombre}
                    WHEN excluded.nombre LIKE 'admin_%' AND ${usuarios.nombre} IS NOT NULL THEN ${usuarios.nombre}
                    ELSE excluded.nombre END`, updatedAt: new Date()},
            });
            if (num) await tx.insert(userIdentities).values({userId: id, identityType: 'phone', identityValue: num}).onConflictDoNothing();
            if (lid) await replaceIdentity(tx, id, 'lid', lid);
            await tx.insert(userRegistrations).values({userId: id, serialNumber}).onConflictDoUpdate({
                target: userRegistrations.userId, set: {serialNumber},
            });
            await ensureEconomyRows(tx, id, 'admin_creation');
        });
    },

    async completeRegistration({id, nombre, gender, birthday, regTime, serialNumber}) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({id, nombre}).onConflictDoUpdate({target: usuarios.id, set: {nombre, updatedAt: new Date()}});
            await tx.insert(userProfiles).values({userId: id, gender, birthday}).onConflictDoUpdate({
                target: userProfiles.userId, set: {gender, birthday, updatedAt: new Date()},
            });
            await tx.insert(userRegistrations).values({userId: id, serialNumber, registeredAt: regTime})
                .onConflictDoUpdate({target: userRegistrations.userId, set: {serialNumber, registeredAt: regTime}});
            await ensureEconomyRows(tx, id, 'registration_creation');
            const walletId = await getAccountId(tx, id, 'wallet');
            if (!walletId) return;
            const balances = await lockBalances(tx, [walletId], ['limite', 'exp', 'coins']);
            const rewards = {limite: 2, exp: 150, coins: 400} as const;
            const entries = [];
            for (const [resource, amount] of Object.entries(rewards)) {
                const current = balances.find(row => row.resourceCode === resource);
                if (!current) continue;
                const balanceAfter = current.balance + amount;
                await updateBalance(tx, walletId, resource, balanceAfter);
                entries.push({accountId: walletId, resourceCode: resource, amount, balanceAfter});
            }
            const operationId = await createFinancialOperation(tx, {reason: 'registration', operation: 'register', actorId: id});
            await insertLedgerEntries(tx, operationId, entries);
        });
    },

    async unregister(userId) {
        await orm.transaction(async tx => {
            await tx.delete(userRegistrations).where(eq(userRegistrations.userId, userId));
            await tx.update(usuarios).set({nombre: null, updatedAt: new Date()}).where(eq(usuarios.id, userId));
            const walletId = await getAccountId(tx, userId, 'wallet');
            if (!walletId) return;
            const balances = await lockBalances(tx, [walletId], ['limite', 'exp', 'coins']);
            const charges = {limite: 2, exp: 150, coins: 400} as const;
            const entries = [];
            for (const [resource, amount] of Object.entries(charges)) {
                const current = balances.find(row => row.resourceCode === resource);
                if (!current) continue;
                const balanceAfter = Math.max(0, current.balance - amount);
                const actualAmount = balanceAfter - current.balance;
                if (!actualAmount) continue;
                await updateBalance(tx, walletId, resource, balanceAfter);
                entries.push({accountId: walletId, resourceCode: resource, amount: actualAmount, balanceAfter});
            }
            if (entries.length) {
                const operationId = await createFinancialOperation(tx, {reason: 'unregistration', operation: 'unregister', actorId: userId});
                await insertLedgerEntries(tx, operationId, entries);
            }
        });
    },

    async setGender(userId, gender) {
        const [updated] = await orm.insert(userProfiles).values({userId, gender}).onConflictDoUpdate({
            target: userProfiles.userId, set: {gender, updatedAt: new Date()},
        }).returning({id: userProfiles.userId});
        return !!updated;
    },

    async setBirthday(userId, birthday) {
        const [updated] = await orm.insert(userProfiles).values({userId, birthday}).onConflictDoUpdate({
            target: userProfiles.userId, set: {birthday, updatedAt: new Date()},
        }).returning({id: userProfiles.userId});
        return !!updated;
    },

    async countUsers() {
        const [row] = await orm.select({
            total: sql<number>`COUNT(*)::int`, registered: sql<number>`COUNT(${userRegistrations.userId})::int`,
        }).from(usuarios).leftJoin(userRegistrations, eq(userRegistrations.userId, usuarios.id));
        return {total: row?.total ?? 0, registered: row?.registered ?? 0};
    },

    async findStickerSettings(userId) {
        const [row] = await orm.select({sticker_packname: userStickerPreferences.packname, sticker_author: userStickerPreferences.author})
            .from(userStickerPreferences).where(eq(userStickerPreferences.userId, userId)).limit(1);
        return row ?? null;
    },

    async setStickerSettings(userId, packname, author) {
        await orm.insert(userStickerPreferences).values({userId, packname, author}).onConflictDoUpdate({
            target: userStickerPreferences.userId, set: {packname, author, updatedAt: new Date()},
        });
    },

    async findWarnInfo(userId) {
        const [user] = await orm.select({id: usuarios.id}).from(usuarios).where(eq(usuarios.id, userId)).limit(1);
        if (!user) return null;
        const [warning] = await orm.select({count: userWarnings.count}).from(userWarnings).where(and(
            eq(userWarnings.userId, userId), eq(userWarnings.warningType, 'general'),
        )).limit(1);
        return {id: userId, warn: warning?.count ?? 0};
    },

    async incrementWarn(userId) {
        await orm.insert(userWarnings).values({userId, warningType: 'general', count: 1}).onConflictDoUpdate({
            target: [userWarnings.userId, userWarnings.warningType],
            set: {count: sql`${userWarnings.count} + 1`, updatedAt: new Date()},
        });
    },

    async decrementWarn(userId) {
        await orm.update(userWarnings).set({count: sql`GREATEST(${userWarnings.count} - 1, 0)`, updatedAt: new Date()})
            .where(and(eq(userWarnings.userId, userId), eq(userWarnings.warningType, 'general')));
    },

    async resetWarn(userId) {
        await orm.delete(userWarnings).where(and(eq(userWarnings.userId, userId), eq(userWarnings.warningType, 'general')));
    },

    async listWarnedUsers() {
        return orm.select({id: userWarnings.userId, warn: userWarnings.count}).from(userWarnings)
            .where(and(eq(userWarnings.warningType, 'general'), sql`${userWarnings.count} > 0`));
    },

    async findNumberByLid(lid) {
        const [lidIdentity] = await orm.select({userId: userIdentities.userId}).from(userIdentities).where(and(
            eq(userIdentities.identityType, 'lid'), eq(userIdentities.identityValue, lid),
        )).limit(1);
        if (!lidIdentity) return null;
        const [phone] = await orm.select({value: userIdentities.identityValue}).from(userIdentities).where(and(
            eq(userIdentities.userId, lidIdentity.userId), eq(userIdentities.identityType, 'phone'),
        )).limit(1);
        return phone?.value ?? null;
    },

    async listBannedUsers() {
        return orm.select({id: userBans.userId, razon_ban: userBans.reason, avisos_ban: userBans.noticeCount}).from(userBans);
    },

    async listMarriedUsers() {
        const otherMember = alias(marriageMembers, 'other_marriage_member');
        return orm.select({id: marriageMembers.userId, marry: otherMember.userId}).from(marriageMembers)
            .innerJoin(otherMember, and(eq(otherMember.marriageId, marriageMembers.marriageId), ne(otherMember.userId, marriageMembers.userId)));
    },

    async getPrivateWarn(userId) {
        const [user] = await orm.select({id: usuarios.id}).from(usuarios).where(eq(usuarios.id, userId)).limit(1);
        if (!user) return null;
        const [state] = await orm.select({warned: userPrivateChatStates.warned}).from(userPrivateChatStates)
            .where(eq(userPrivateChatStates.userId, userId)).limit(1);
        return state?.warned ?? false;
    },

    async setPrivateWarn(userId, warned) {
        await orm.transaction(async tx => {
            await tx.insert(usuarios).values({id: userId}).onConflictDoNothing();
            await tx.insert(userPrivateChatStates).values({userId, warned}).onConflictDoUpdate({
                target: userPrivateChatStates.userId, set: {warned, updatedAt: new Date()},
            });
            await ensureEconomyRows(tx, userId, 'private_warning_creation');
        });
    },

    async setMarriageRequest(userId, requesterId) {
        await orm.transaction(async tx => {
            await tx.update(marriageRequests).set({status: 'cancelled', resolvedAt: new Date()}).where(and(
                eq(marriageRequests.recipientId, userId), eq(marriageRequests.status, 'pending'),
            ));
            if (requesterId) await tx.insert(marriageRequests).values({requesterId, recipientId: userId});
        });
    },

    async getMarriageRequest(userId) {
        const [row] = await orm.select({requesterId: marriageRequests.requesterId}).from(marriageRequests).where(and(
            eq(marriageRequests.recipientId, userId), eq(marriageRequests.status, 'pending'),
        )).limit(1);
        return row?.requesterId ?? null;
    },

    async marryUsers(userA, userB) {
        await orm.transaction(async tx => {
            const memberships = await tx.select({marriageId: marriageMembers.marriageId}).from(marriageMembers)
                .where(inArray(marriageMembers.userId, [userA, userB]));
            if (memberships.length) await tx.delete(marriages).where(inArray(marriages.id, memberships.map(row => row.marriageId)));
            const [marriage] = await tx.insert(marriages).values({}).returning({id: marriages.id});
            await tx.insert(marriageMembers).values([
                {marriageId: marriage.id, userId: userA}, {marriageId: marriage.id, userId: userB},
            ]);
            await tx.update(marriageRequests).set({status: 'accepted', resolvedAt: new Date()}).where(and(
                eq(marriageRequests.requesterId, userB), eq(marriageRequests.recipientId, userA), eq(marriageRequests.status, 'pending'),
            ));
        });
    },

    async divorceUsers(userA, userB) {
        const memberships = await orm.select({marriageId: marriageMembers.marriageId}).from(marriageMembers)
            .where(inArray(marriageMembers.userId, [userA, userB]));
        const grouped = memberships.reduce<Map<string, number>>(
            (map, row) => map.set(row.marriageId, (map.get(row.marriageId) ?? 0) + 1), new Map(),
        );
        const marriageId = [...grouped].find(([, count]) => count === 2)?.[0];
        if (marriageId) await orm.delete(marriages).where(eq(marriages.id, marriageId));
    },
};
