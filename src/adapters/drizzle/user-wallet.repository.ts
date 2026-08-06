import {and, asc, count, desc, eq, inArray, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {userWallets, usuarios, walletTransactions} from '../../db/schema.js';
import type {RewardTimestampField, TransferableWalletResource, WalletResource} from '../../domain/users.js';
import type {UserRepository} from '../../ports/repositories.js';
import {mapUserResources, mapUserWallet} from './user.mapper.js';
import {
    evaluateRobProgress,
    getMaxRobExp,
    getNextRobAvailability,
    getRandomRobExp,
    getRequiredRobLevel,
    isValidRobAmount,
    ROB_DAILY_LIMIT,
} from '../../domain/robbery.js';

const walletColumns = {
    limite: userWallets.limite,
    exp: userWallets.exp,
    coins: userWallets.coins,
    botcoin: userWallets.botcoin,
    zyxcoin: userWallets.zyxcoin,
} as const;

function walletColumn(resource: WalletResource) {
    return walletColumns[resource];
}

function walletProperty(resource: WalletResource): WalletResource {
    return resource;
}

function rewardFieldProperty(field: RewardTimestampField) {
    const properties = {
        lastclaim: 'lastclaim',
        dailystreak: 'dailystreak',
        lastcofre: 'lastcofre',
        lastmiming: 'lastmiming',
        lastwork: 'lastwork',
        crime: 'crime',
        lastrob: 'lastrob',
        lastslut: 'lastslut',
        timevot: 'timevot',
        ryTime: 'ryTime',
    } as const;
    return properties[field];
}

export const walletUserRepositoryMethods: Pick<UserRepository,
    | 'findWallet'
    | 'listWallets'
    | 'getResources'
    | 'addWalletResource'
    | 'addWalletResourceAndSetWait'
    | 'addWalletResourcesAndSetFields'
    | 'exchangeWalletResources'
    | 'transferWalletResource'
    | 'listWalletTransferHistory'
    | 'robExperience'
    | 'setLevelRole'
    | 'decrementLimit'
    | 'decrementCoins'
> = {
    async findWallet(userId) {
        const [row] = await orm.select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            limite: userWallets.limite,
            exp: userWallets.exp,
            coins: userWallets.coins,
            botcoin: userWallets.botcoin,
            zyxcoin: userWallets.zyxcoin,
            level: usuarios.level,
            role: usuarios.role,
            wait: usuarios.wait,
            lastclaim: usuarios.lastclaim,
            dailystreak: usuarios.dailystreak,
            lastcofre: usuarios.lastcofre,
            lastmiming: usuarios.lastmiming,
            lastwork: usuarios.lastwork,
            crime: usuarios.crime,
            lastrob: usuarios.lastrob,
            lastslut: usuarios.lastslut,
            timevot: usuarios.timevot,
            ryTime: usuarios.ryTime,
        }).from(usuarios)
            .leftJoin(userWallets, eq(userWallets.userId, usuarios.id))
            .where(eq(usuarios.id, userId)).limit(1);
        return row ? mapUserWallet(row) : null;
    },

    async listWallets() {
        const rows = await orm.select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            limite: userWallets.limite,
            exp: userWallets.exp,
            coins: userWallets.coins,
            botcoin: userWallets.botcoin,
            zyxcoin: userWallets.zyxcoin,
            level: usuarios.level,
            role: usuarios.role,
            wait: usuarios.wait,
            lastclaim: usuarios.lastclaim,
            dailystreak: usuarios.dailystreak,
            lastcofre: usuarios.lastcofre,
            lastmiming: usuarios.lastmiming,
            lastwork: usuarios.lastwork,
            crime: usuarios.crime,
            lastrob: usuarios.lastrob,
            lastslut: usuarios.lastslut,
            timevot: usuarios.timevot,
            ryTime: usuarios.ryTime,
        }).from(usuarios).leftJoin(userWallets, eq(userWallets.userId, usuarios.id));
        return rows.map(mapUserWallet);
    },

    async getResources(userId) {
        const [row] = await orm.select({
            limite: userWallets.limite,
            coins: userWallets.coins,
            level: usuarios.level,
        }).from(usuarios).leftJoin(userWallets, eq(userWallets.userId, usuarios.id))
            .where(eq(usuarios.id, userId)).limit(1);
        return mapUserResources(row);
    },

    async addWalletResource(userId, resource, amount, reason, operation) {
        return orm.transaction(async tx => {
            const column = walletColumn(resource);
            const [current] = await tx.select({value: column}).from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            if (!current) return null;
            const next = Math.max(0, current.value + amount);
            const actualAmount = next - current.value;
            await tx.update(userWallets).set({[walletProperty(resource)]: next, updatedAt: new Date()})
                .where(eq(userWallets.userId, userId));
            if (actualAmount !== 0) await tx.insert(walletTransactions).values({
                userId, resource, amount: actualAmount, balanceAfter: next, reason, operation,
            });
            return next;
        });
    },

    async addWalletResourceAndSetWait(userId, resource, amount, wait, reason, operation) {
        return orm.transaction(async tx => {
            const column = walletColumn(resource);
            const [current] = await tx.select({value: column}).from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            if (!current) return null;
            const next = Math.max(0, current.value + amount);
            const actualAmount = next - current.value;
            await tx.update(userWallets).set({[walletProperty(resource)]: next, updatedAt: new Date()})
                .where(eq(userWallets.userId, userId));
            await tx.update(usuarios).set({wait}).where(eq(usuarios.id, userId));
            if (actualAmount !== 0) await tx.insert(walletTransactions).values({
                userId, resource, amount: actualAmount, balanceAfter: next, reason, operation,
            });
            return next;
        });
    },

    async addWalletResourcesAndSetFields({userId, resources, fields, reason, operation}) {
        await orm.transaction(async tx => {
            const [current] = await tx.select().from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            if (!current) return;
            const walletSet: Record<string, number | Date> = {updatedAt: new Date()};
            const entries: Array<typeof walletTransactions.$inferInsert> = [];
            for (const [resource, amount] of Object.entries(resources) as Array<[WalletResource, number]>) {
                const before = current[resource];
                const after = Math.max(0, before + amount);
                const actualAmount = after - before;
                walletSet[resource] = after;
                if (actualAmount !== 0) entries.push({
                    userId, resource, amount: actualAmount, balanceAfter: after, reason, operation,
                });
            }
            if (Object.keys(resources).length) await tx.update(userWallets).set(walletSet)
                .where(eq(userWallets.userId, userId));
            const userSet: Record<string, number> = {};
            for (const [field, value] of Object.entries(fields) as Array<[RewardTimestampField, number]>) {
                userSet[rewardFieldProperty(field)] = value;
            }
            if (Object.keys(userSet).length) await tx.update(usuarios).set(userSet)
                .where(eq(usuarios.id, userId));
            if (entries.length) await tx.insert(walletTransactions).values(entries);
        });
    },

    async exchangeWalletResources({userId, from, to, fromAmount, toAmount, reason, operation}) {
        if (from === to || fromAmount <= 0 || toAmount <= 0) return false;
        return orm.transaction(async tx => {
            const [wallet] = await tx.select().from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            if (!wallet) return false;
            const fromBalance = wallet[from];
            if (fromBalance < fromAmount) return false;
            const toBalance = wallet[to];
            await tx.update(userWallets).set({
                [from]: fromBalance - fromAmount,
                [to]: toBalance + toAmount,
                updatedAt: new Date(),
            }).where(eq(userWallets.userId, userId));
            await tx.insert(walletTransactions).values([
                {
                userId, resource: from, amount: -fromAmount, balanceAfter: fromBalance - fromAmount, reason, operation,
                }, {
                userId, resource: to, amount: toAmount, balanceAfter: toBalance + toAmount, reason, operation,
                },
            ]);
            return true;
        });
    },

    async transferWalletResource({from, to, resource, amount, reason, operation, operationId}) {
        if (from === to || amount <= 0) return false;
        return orm.transaction(async tx => {
            const rows = await tx.select().from(userWallets)
                .where(inArray(userWallets.userId, [from, to])).orderBy(asc(userWallets.userId)).for('update');
            const sender = rows.find(row => row.userId === from);
            const receiver = rows.find(row => row.userId === to);
            if (!sender || !receiver || sender[resource] < amount) return false;
            const senderAfter = sender[resource] - amount;
            const receiverAfter = receiver[resource] + amount;
            await tx.update(userWallets).set({[resource]: senderAfter, updatedAt: new Date()})
                .where(eq(userWallets.userId, from));
            await tx.update(userWallets).set({[resource]: receiverAfter, updatedAt: new Date()})
                .where(eq(userWallets.userId, to));
            await tx.insert(walletTransactions).values([
                {userId: from, resource, amount: -amount, balanceAfter: senderAfter, reason, operation, operationId, counterpartyId: to},
                {userId: to, resource, amount, balanceAfter: receiverAfter, reason, operation, operationId, counterpartyId: from},
            ]);
            return true;
        });
    },

    async listWalletTransferHistory(userId, page, pageSize) {
        const offset = (page - 1) * pageSize;
        const where = and(eq(walletTransactions.userId, userId), eq(walletTransactions.reason, 'transfer'));
        const [[totalRow], rows] = await Promise.all([
            orm.select({value: count()}).from(walletTransactions).where(where),
            orm.select({
                id: walletTransactions.id,
                resource: walletTransactions.resource,
                amount: walletTransactions.amount,
                balanceAfter: walletTransactions.balanceAfter,
                counterpartyId: walletTransactions.counterpartyId,
                operationId: walletTransactions.operationId,
                createdAt: walletTransactions.createdAt,
            }).from(walletTransactions).where(where)
                .orderBy(desc(walletTransactions.createdAt), desc(walletTransactions.id))
                .limit(pageSize).offset(offset),
        ]);
        const totalItems = totalRow?.value ?? 0;
        return {
            items: rows.map(row => ({...row, resource: row.resource as TransferableWalletResource})),
            page,
            pageSize,
            totalItems,
            totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
        };
    },

    async robExperience({robberId, victimId, amount, attemptedAt}) {
        if (robberId === victimId) return {kind: 'same_user'};
        if (amount !== undefined && !isValidRobAmount(amount)) return {kind: 'invalid_amount'};
        return orm.transaction(async tx => {
            const users = await tx.select({
                id: usuarios.id,
                level: usuarios.level,
                lastrob: usuarios.lastrob,
                robDailyCount: usuarios.robDailyCount,
                robDay: usuarios.robDay,
            }).from(usuarios).where(inArray(usuarios.id, [robberId, victimId]))
                .orderBy(asc(usuarios.id)).for('update');
            const wallets = await tx.select({userId: userWallets.userId, exp: userWallets.exp})
                .from(userWallets).where(inArray(userWallets.userId, [robberId, victimId]))
                .orderBy(asc(userWallets.userId)).for('update');
            const robber = users.find(row => row.id === robberId);
            const victim = users.find(row => row.id === victimId);
            const robberWallet = wallets.find(row => row.userId === robberId);
            const victimWallet = wallets.find(row => row.userId === victimId);
            if (!robber || !robberWallet) return {kind: 'missing_robber'} as const;
            if (!victim || !victimWallet) return {kind: 'missing_victim'} as const;
            const progress = evaluateRobProgress({
                lastRobAt: robber.lastrob ?? 0,
                dailyCount: robber.robDailyCount,
                dayKey: robber.robDay,
            }, attemptedAt);
            if (progress.kind !== 'allowed') return progress;
            const availableLevel = Math.max(0, robber.level ?? 0);
            const maxAmount = getMaxRobExp(availableLevel);
            const requestedAmount = amount ?? getRandomRobExp(availableLevel);
            const requiredLevel = getRequiredRobLevel(requestedAmount);
            if (requiredLevel === 0 || availableLevel < requiredLevel) return {
                kind: 'insufficient_level', availableLevel, requiredLevel: Math.max(1, requiredLevel), maxAmount,
            } as const;
            if (victimWallet.exp < requestedAmount) return {
                kind: 'insufficient_victim_exp', available: victimWallet.exp, required: requestedAmount,
            } as const;
            const dailyCount = progress.dailyCount + 1;
            const remainingRobberies = ROB_DAILY_LIMIT - dailyCount;
            const nextAvailableAt = getNextRobAvailability(attemptedAt, dailyCount);
            const robberAfter = robberWallet.exp + requestedAmount;
            const victimAfter = victimWallet.exp - requestedAmount;
            await tx.update(userWallets).set({exp: victimAfter, updatedAt: new Date()})
                .where(eq(userWallets.userId, victimId));
            await tx.update(userWallets).set({exp: robberAfter, updatedAt: new Date()})
                .where(eq(userWallets.userId, robberId));
            await tx.update(usuarios).set({lastrob: attemptedAt, robDailyCount: dailyCount, robDay: progress.dayKey})
                .where(eq(usuarios.id, robberId));
            await tx.insert(walletTransactions).values([
                {userId: victimId, resource: 'exp', amount: -requestedAmount, balanceAfter: victimAfter, reason: 'robbery', operation: 'rob', counterpartyId: robberId},
                {userId: robberId, resource: 'exp', amount: requestedAmount, balanceAfter: robberAfter, reason: 'robbery', operation: 'rob', counterpartyId: victimId},
            ]);
            return {
                kind: 'success', amount: requestedAmount, availableLevel, maxAmount, remainingRobberies,
                nextAvailableAt, dailyLimitReached: dailyCount >= ROB_DAILY_LIMIT,
            } as const;
        });
    },

    async setLevelRole(userId, level, role) {
        await orm.update(usuarios).set({level, role}).where(eq(usuarios.id, userId));
    },

    async decrementLimit(userId, amount) {
        await this.addWalletResource(userId, 'limite', -amount, 'command_cost', 'legacy_limit_cost');
    },

    async decrementCoins(userId, amount) {
        await this.addWalletResource(userId, 'coins', -amount, 'command_cost', 'legacy_coins_cost');
    },
};
