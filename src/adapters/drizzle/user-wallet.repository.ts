import {and, asc, count, desc, eq, inArray, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    accountBalances, economyResources, financialAccounts, financialOperations, ledgerEntries, userCooldowns,
    userDailyRewards, userIdentities, userProductSubscriptions, userProgress, userRobberyStates, usuarios,
} from '../../db/schema.js';
import type {RewardTimestampField, TransferableWalletResource, WalletResource} from '../../domain/users.js';
import type {UserRepository} from '../../ports/repositories.js';
import {mapUserResources, mapUserWallet, type UserWalletRow} from './user.mapper.js';
import {
    createFinancialOperation, ensureUserAccounts, getAccountId, insertLedgerEntries,
    lockBalances, mapBalanceRows, updateBalance, WALLET_RESOURCES,
} from './economy-account.helpers.js';
import {
    applyRobberyProtection, evaluateRobProgress, getMaxRobAmount, getNextRobAvailability, getRandomRobAmount,
    getRequiredRobLevelForResource, ROB_DAILY_LIMIT,
} from '../../domain/robbery.js';
import {SECURITY_PRODUCT_CODE} from '../../domain/store.js';

const cooldownMillis = (action: RewardTimestampField | 'wait') => sql<number>`COALESCE((
    SELECT EXTRACT(EPOCH FROM last_used_at) * 1000 FROM bot_identity.user_cooldowns
    WHERE user_id = ${usuarios.id} AND action = ${action}
), 0)::bigint`.mapWith(Number);

const identityValue = (type: 'phone' | 'lid' | 'username') => sql<string | null>`(
    SELECT identity_value FROM ${userIdentities}
    WHERE user_id = ${usuarios.id} AND identity_type = ${type} LIMIT 1
)`;

async function loadWallet(userId: string): Promise<UserWalletRow | null> {
    const [user] = await orm.select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        username: identityValue('username'),
        num: identityValue('phone'),
        lid: identityValue('lid'),
        level: userProgress.level,
        role: userProgress.role,
        wait: cooldownMillis('wait'),
        lastclaim: cooldownMillis('lastclaim'),
        dailystreak: userDailyRewards.streak,
        lastcofre: cooldownMillis('lastcofre'),
        lastmiming: cooldownMillis('lastmiming'),
        lastwork: cooldownMillis('lastwork'),
        crime: cooldownMillis('crime'),
        lastrob: cooldownMillis('lastrob'),
        lastslut: cooldownMillis('lastslut'),
        timevot: cooldownMillis('timevot'),
        ryTime: cooldownMillis('ryTime'),
    }).from(usuarios)
        .leftJoin(userProgress, eq(userProgress.userId, usuarios.id))
        .leftJoin(userDailyRewards, eq(userDailyRewards.userId, usuarios.id))
        .where(eq(usuarios.id, userId)).limit(1);
    if (!user) return null;
    const balances = await orm.select({resourceCode: accountBalances.resourceCode, balance: accountBalances.balance})
        .from(financialAccounts).innerJoin(accountBalances, eq(accountBalances.accountId, financialAccounts.id))
        .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.accountType, 'wallet')));
    return {...user, ...mapBalanceRows(balances)};
}

export const walletUserRepositoryMethods: Pick<UserRepository,
    | 'findWallet' | 'listWallets' | 'getResources' | 'addWalletResource'
    | 'addWalletResourceAndSetWait' | 'addWalletResourcesAndSetFields'
    | 'exchangeWalletResources' | 'transferWalletResource' | 'listWalletTransferHistory'
    | 'robExperience' | 'setLevelRole' | 'decrementLimit' | 'decrementCoins'
> = {
    async findWallet(userId) {
        const wallet = await loadWallet(userId);
        return wallet ? mapUserWallet(wallet) : null;
    },

    async listWallets() {
        const users = await orm.select({
            id: usuarios.id,
            nombre: usuarios.nombre,
            username: identityValue('username'),
            num: identityValue('phone'),
            lid: identityValue('lid'),
            level: userProgress.level,
            role: userProgress.role,
            wait: cooldownMillis('wait'), lastclaim: cooldownMillis('lastclaim'),
            dailystreak: userDailyRewards.streak, lastcofre: cooldownMillis('lastcofre'),
            lastmiming: cooldownMillis('lastmiming'), lastwork: cooldownMillis('lastwork'),
            crime: cooldownMillis('crime'), lastrob: cooldownMillis('lastrob'),
            lastslut: cooldownMillis('lastslut'), timevot: cooldownMillis('timevot'), ryTime: cooldownMillis('ryTime'),
        }).from(usuarios)
            .leftJoin(userProgress, eq(userProgress.userId, usuarios.id))
            .leftJoin(userDailyRewards, eq(userDailyRewards.userId, usuarios.id));
        const rows = await orm.select({
            userId: financialAccounts.userId,
            resourceCode: accountBalances.resourceCode,
            balance: accountBalances.balance,
        }).from(financialAccounts).innerJoin(accountBalances, eq(accountBalances.accountId, financialAccounts.id))
            .where(eq(financialAccounts.accountType, 'wallet'));
        return users.map(user => mapUserWallet({
            ...user,
            ...mapBalanceRows(rows.filter(row => row.userId === user.id)),
        }));
    },

    async getResources(userId) {
        const wallet = await loadWallet(userId);
        return mapUserResources(wallet ? {limite: wallet.limite, coins: wallet.coins, level: wallet.level} : undefined);
    },

    async addWalletResource(userId, resource, amount, reason, operation) {
        return orm.transaction(async tx => {
            const accountId = await getAccountId(tx, userId, 'wallet');
            if (!accountId) return null;
            const [current] = await lockBalances(tx, [accountId], [resource]);
            if (!current) return null;
            const next = Math.max(0, current.balance + amount);
            const actualAmount = next - current.balance;
            if (actualAmount === 0) return next;
            await updateBalance(tx, accountId, resource, next);
            const operationId = await createFinancialOperation(tx, {reason, operation, actorId: userId});
            await insertLedgerEntries(tx, operationId, [{accountId, resourceCode: resource, amount: actualAmount, balanceAfter: next}]);
            return next;
        });
    },

    async addWalletResourceAndSetWait(userId, resource, amount, wait, reason, operation) {
        return orm.transaction(async tx => {
            const accountId = await getAccountId(tx, userId, 'wallet');
            if (!accountId) return null;
            const [current] = await lockBalances(tx, [accountId], [resource]);
            if (!current) return null;
            const next = Math.max(0, current.balance + amount);
            const actualAmount = next - current.balance;
            if (actualAmount !== 0) {
                await updateBalance(tx, accountId, resource, next);
                const operationId = await createFinancialOperation(tx, {reason, operation, actorId: userId});
                await insertLedgerEntries(tx, operationId, [{accountId, resourceCode: resource, amount: actualAmount, balanceAfter: next}]);
            }
            await tx.insert(userCooldowns).values({userId, action: 'wait', lastUsedAt: new Date(wait)})
                .onConflictDoUpdate({target: [userCooldowns.userId, userCooldowns.action], set: {lastUsedAt: new Date(wait)}});
            return next;
        });
    },

    async addWalletResourcesAndSetFields({userId, resources, fields, reason, operation}) {
        await orm.transaction(async tx => {
            const accountId = await getAccountId(tx, userId, 'wallet');
            if (!accountId) return;
            const resourceEntries = Object.entries(resources) as Array<[WalletResource, number]>;
            const currentRows = await lockBalances(tx, [accountId], resourceEntries.map(([resource]) => resource));
            const entries: Array<{accountId: string; resourceCode: string; amount: number; balanceAfter: number}> = [];
            for (const [resource, amount] of resourceEntries) {
                const current = currentRows.find(row => row.resourceCode === resource);
                if (!current) continue;
                const after = Math.max(0, current.balance + amount);
                const actualAmount = after - current.balance;
                if (!actualAmount) continue;
                await updateBalance(tx, accountId, resource, after);
                entries.push({accountId, resourceCode: resource, amount: actualAmount, balanceAfter: after});
            }
            if (entries.length) {
                const operationId = await createFinancialOperation(tx, {reason, operation, actorId: userId});
                await insertLedgerEntries(tx, operationId, entries);
            }
            for (const [field, value] of Object.entries(fields) as Array<[RewardTimestampField, number]>) {
                if (field === 'dailystreak') {
                    await tx.insert(userDailyRewards).values({userId, streak: Math.max(0, value)})
                        .onConflictDoUpdate({target: userDailyRewards.userId, set: {streak: Math.max(0, value)}});
                } else if (value > 0) {
                    await tx.insert(userCooldowns).values({userId, action: field, lastUsedAt: new Date(value)})
                        .onConflictDoUpdate({target: [userCooldowns.userId, userCooldowns.action], set: {lastUsedAt: new Date(value)}});
                } else {
                    await tx.delete(userCooldowns).where(and(eq(userCooldowns.userId, userId), eq(userCooldowns.action, field)));
                }
            }
        });
    },

    async exchangeWalletResources({userId, from, to, fromAmount, toAmount, reason, operation}) {
        if (from === to || fromAmount <= 0 || toAmount <= 0) return false;
        return orm.transaction(async tx => {
            const accountId = await getAccountId(tx, userId, 'wallet');
            if (!accountId) return false;
            const rows = await lockBalances(tx, [accountId], [from, to]);
            const source = rows.find(row => row.resourceCode === from);
            const target = rows.find(row => row.resourceCode === to);
            if (!source || !target || source.balance < fromAmount) return false;
            const sourceAfter = source.balance - fromAmount;
            const targetAfter = target.balance + toAmount;
            await updateBalance(tx, accountId, from, sourceAfter);
            await updateBalance(tx, accountId, to, targetAfter);
            const operationId = await createFinancialOperation(tx, {reason, operation, actorId: userId});
            await insertLedgerEntries(tx, operationId, [
                {accountId, resourceCode: from, amount: -fromAmount, balanceAfter: sourceAfter},
                {accountId, resourceCode: to, amount: toAmount, balanceAfter: targetAfter},
            ]);
            return true;
        });
    },

    async transferWalletResource({from, to, resource, amount, reason, operation, operationId: externalId}) {
        if (from === to || amount <= 0) return false;
        return orm.transaction(async tx => {
            const accounts = await tx.select({id: financialAccounts.id, userId: financialAccounts.userId})
                .from(financialAccounts).where(and(
                    inArray(financialAccounts.userId, [from, to]), eq(financialAccounts.accountType, 'wallet'),
                ));
            const sender = accounts.find(row => row.userId === from);
            const receiver = accounts.find(row => row.userId === to);
            if (!sender || !receiver) return false;
            const rows = await lockBalances(tx, [sender.id, receiver.id], [resource]);
            const senderBalance = rows.find(row => row.accountId === sender.id);
            const receiverBalance = rows.find(row => row.accountId === receiver.id);
            if (!senderBalance || !receiverBalance || senderBalance.balance < amount) return false;
            const senderAfter = senderBalance.balance - amount;
            const receiverAfter = receiverBalance.balance + amount;
            await updateBalance(tx, sender.id, resource, senderAfter);
            await updateBalance(tx, receiver.id, resource, receiverAfter);
            const id = await createFinancialOperation(tx, {reason, operation, externalId, actorId: from, counterpartyId: to});
            await insertLedgerEntries(tx, id, [
                {accountId: sender.id, resourceCode: resource, amount: -amount, balanceAfter: senderAfter},
                {accountId: receiver.id, resourceCode: resource, amount, balanceAfter: receiverAfter},
            ]);
            return true;
        });
    },

    async listWalletTransferHistory(userId, page, pageSize) {
        const offset = (page - 1) * pageSize;
        const where = and(eq(financialAccounts.userId, userId), eq(financialAccounts.accountType, 'wallet'), eq(financialOperations.reason, 'transfer'));
        const [[totalRow], rows] = await Promise.all([
            orm.select({value: count()}).from(ledgerEntries)
                .innerJoin(financialAccounts, eq(financialAccounts.id, ledgerEntries.accountId))
                .innerJoin(financialOperations, eq(financialOperations.id, ledgerEntries.operationId)).where(where),
            orm.select({
                id: ledgerEntries.id,
                resource: ledgerEntries.resourceCode,
                amount: ledgerEntries.amount,
                balanceAfter: ledgerEntries.balanceAfter,
                counterpartyId: financialOperations.counterpartyId,
                operationId: financialOperations.externalId,
                createdAt: ledgerEntries.createdAt,
            }).from(ledgerEntries)
                .innerJoin(financialAccounts, eq(financialAccounts.id, ledgerEntries.accountId))
                .innerJoin(financialOperations, eq(financialOperations.id, ledgerEntries.operationId))
                .where(where).orderBy(desc(ledgerEntries.createdAt), desc(ledgerEntries.id)).limit(pageSize).offset(offset),
        ]);
        const totalItems = totalRow?.value ?? 0;
        return {
            items: rows.map(row => ({...row, resource: row.resource as TransferableWalletResource})),
            page, pageSize, totalItems, totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
        };
    },

    async robExperience({robberId, victimId, amount, attemptedAt, resource = 'exp', account = 'wallet'}) {
        if (robberId === victimId) return {kind: 'same_user'};
        if (amount !== undefined && (!Number.isSafeInteger(amount) || amount <= 0)) return {kind: 'invalid_amount'};
        if (account !== 'wallet') return {kind: 'unsupported_resource'};
        return orm.transaction(async tx => {
            const users = await tx.select({id: usuarios.id}).from(usuarios).where(inArray(usuarios.id, [robberId, victimId]))
                .orderBy(asc(usuarios.id)).for('update');
            if (!users.some(row => row.id === robberId)) return {kind: 'missing_robber'} as const;
            if (!users.some(row => row.id === victimId)) return {kind: 'missing_victim'} as const;
            const [resourcePolicy] = await tx.select().from(economyResources).where(eq(economyResources.code, resource)).limit(1);
            if (!resourcePolicy?.robberyEnabled) {
                return {kind: 'unsupported_resource'} as const;
            }
            const accounts = await tx.select({id: financialAccounts.id, userId: financialAccounts.userId, type: financialAccounts.accountType})
                .from(financialAccounts).where(and(
                    inArray(financialAccounts.userId, [robberId, victimId]),
                    eq(financialAccounts.accountType, 'wallet'),
                ));
            const robberAccount = accounts.find(row => row.userId === robberId && row.type === 'wallet');
            const victimAccount = accounts.find(row => row.userId === victimId && row.type === 'wallet');
            if (!robberAccount) return {kind: 'missing_robber'} as const;
            if (!victimAccount) return {kind: 'missing_account'} as const;
            const balances = await lockBalances(tx, [robberAccount.id, victimAccount.id], [resource]);
            const robberBalance = balances.find(row => row.accountId === robberAccount.id);
            const victimBalance = balances.find(row => row.accountId === victimAccount.id);
            if (!robberBalance) return {kind: 'missing_robber'} as const;
            if (!victimBalance) return {kind: 'missing_victim'} as const;
            const [[progressRow], [cooldown], [robberyState]] = await Promise.all([
                tx.select().from(userProgress).where(eq(userProgress.userId, robberId)).limit(1),
                tx.select().from(userCooldowns).where(and(eq(userCooldowns.userId, robberId), eq(userCooldowns.action, 'lastrob'))).limit(1),
                tx.select().from(userRobberyStates).where(eq(userRobberyStates.userId, robberId)).limit(1),
            ]);
            const progress = evaluateRobProgress({
                lastRobAt: cooldown?.lastUsedAt.getTime() ?? 0,
                dailyCount: robberyState?.dailyCount ?? 0,
                dayKey: robberyState?.activityDay ?? null,
            }, attemptedAt);
            if (progress.kind !== 'allowed') return progress;
            const availableLevel = Math.max(0, progressRow?.level ?? 0);
            const maxAmount = getMaxRobAmount(availableLevel, resourcePolicy.valueInExp);
            const requestedAmount = amount ?? getRandomRobAmount(availableLevel, resourcePolicy.valueInExp);
            const requiredLevel = getRequiredRobLevelForResource(requestedAmount, resourcePolicy.valueInExp);
            if (requiredLevel === 0 || availableLevel < requiredLevel) return {
                kind: 'insufficient_level', availableLevel, requiredLevel: Math.max(1, requiredLevel), maxAmount,
            } as const;
            const [subscription] = resourcePolicy.securityEligible
                ? await tx.select().from(userProductSubscriptions).where(and(
                    eq(userProductSubscriptions.userId, victimId),
                    eq(userProductSubscriptions.productCode, SECURITY_PRODUCT_CODE),
                )).limit(1)
                : [];
            const securityTier = subscription && subscription.paidUntil.getTime() > attemptedAt ? subscription.tier : 0;
            const appliedAmount = applyRobberyProtection(requestedAmount, securityTier, account);
            const dailyCount = progress.dailyCount + 1;
            const remainingRobberies = ROB_DAILY_LIMIT - dailyCount;
            const nextAvailableAt = getNextRobAvailability(attemptedAt, dailyCount);
            if (victimBalance.balance < appliedAmount) return {
                kind: 'insufficient_victim_exp', available: victimBalance.balance, required: appliedAmount,
            } as const;
            await tx.insert(userCooldowns).values({userId: robberId, action: 'lastrob', lastUsedAt: new Date(attemptedAt)})
                .onConflictDoUpdate({target: [userCooldowns.userId, userCooldowns.action], set: {lastUsedAt: new Date(attemptedAt)}});
            await tx.insert(userRobberyStates).values({userId: robberId, dailyCount, activityDay: progress.dayKey})
                .onConflictDoUpdate({target: userRobberyStates.userId, set: {dailyCount, activityDay: progress.dayKey}});
            if (appliedAmount <= 0) return {
                kind: 'security_blocked', resource, account, attemptedAmount: requestedAmount,
                remainingRobberies, nextAvailableAt,
            } as const;
            const robberAfter = robberBalance.balance + appliedAmount;
            const victimAfter = victimBalance.balance - appliedAmount;
            await updateBalance(tx, victimAccount.id, resource, victimAfter);
            await updateBalance(tx, robberAccount.id, resource, robberAfter);
            const operationId = await createFinancialOperation(tx, {
                reason: 'robbery', operation: `rob:${account}:${resource}`, actorId: robberId, counterpartyId: victimId,
            });
            await insertLedgerEntries(tx, operationId, [
                {accountId: victimAccount.id, resourceCode: resource, amount: -appliedAmount, balanceAfter: victimAfter},
                {accountId: robberAccount.id, resourceCode: resource, amount: appliedAmount, balanceAfter: robberAfter},
            ]);
            return {
                kind: 'success', amount: appliedAmount, attemptedAmount: requestedAmount,
                blockedAmount: requestedAmount - appliedAmount, resource, account,
                availableLevel, maxAmount, remainingRobberies, nextAvailableAt,
                dailyLimitReached: dailyCount >= ROB_DAILY_LIMIT,
            } as const;
        });
    },

    async setLevelRole(userId, level, role) {
        await orm.insert(userProgress).values({userId, level, role}).onConflictDoUpdate({
            target: userProgress.userId, set: {level, role, updatedAt: new Date()},
        });
    },

    async decrementLimit(userId, amount) { await this.addWalletResource(userId, 'limite', -amount, 'command_cost', 'legacy_limit_cost'); },
    async decrementCoins(userId, amount) { await this.addWalletResource(userId, 'coins', -amount, 'command_cost', 'legacy_coins_cost'); },
};
