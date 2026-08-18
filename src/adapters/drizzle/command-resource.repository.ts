import {and, eq, lte} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {commandReservationItems, commandResourceReservations, userProgress} from '../../db/schema.js';
import {selectCommandPayment, type CommandResourceReservation} from '../../domain/command-resources.js';
import type {CommandResourceRepository} from '../../ports/repositories.js';
import {
    createFinancialOperation, ensureUserAccounts, getReserveAccountId, insertLedgerEntries,
    lockBalances, updateBalance,
} from './economy-account.helpers.js';

type ReservationRow = typeof commandResourceReservations.$inferSelect;
type ReservationItemRow = typeof commandReservationItems.$inferSelect;
type Transaction = Parameters<Parameters<typeof orm.transaction>[0]>[0];

function itemAmount(items: ReservationItemRow[], resourceCode: string, itemType: string): number {
    return items.find(item => item.resourceCode === resourceCode && item.itemType === itemType)?.amount ?? 0;
}

function mapReservation(row: ReservationRow, items: ReservationItemRow[]): CommandResourceReservation {
    return {
        id: row.id,
        userId: row.userId,
        pluginId: row.pluginId,
        messageId: row.messageId,
        limitAmount: itemAmount(items, 'limite', 'charged'),
        coinsAmount: itemAmount(items, 'coins', 'charged'),
        alternativeCoinsAmount: itemAmount(items, 'coins', 'alternative'),
        paymentResource: row.paymentResource as CommandResourceReservation['paymentResource'],
        requiredLevel: row.requiredLevel,
        status: row.status as CommandResourceReservation['status'],
        releaseReason: row.releaseReason,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        expiresAt: row.expiresAt,
    };
}

function loadItems(tx: Transaction, reservationId: string): Promise<ReservationItemRow[]> {
    return tx.select().from(commandReservationItems)
        .where(eq(commandReservationItems.reservationId, reservationId));
}

export const commandResourceRepository: CommandResourceRepository = {
    async reserve(input) {
        if (!input.limit && !input.coins && !input.alternativeCoins && !input.level) return {kind: 'not_required'};

        return orm.transaction(async tx => {
            const [inserted] = await tx.insert(commandResourceReservations).values({
                id: input.id,
                userId: input.userId,
                pluginId: input.pluginId,
                messageId: input.messageId,
                paymentResource: 'none',
                requiredLevel: input.level,
                expiresAt: input.expiresAt,
            }).onConflictDoNothing().returning();

            if (!inserted) {
                const [existing] = await tx.select().from(commandResourceReservations)
                    .where(eq(commandResourceReservations.id, input.id)).limit(1);
                if (existing) return {
                    kind: 'reserved' as const,
                    reservation: mapReservation(existing, await loadItems(tx, input.id)),
                    duplicate: true,
                };
                return {kind: 'not_required' as const};
            }

            if (input.alternativeCoins > 0) await tx.insert(commandReservationItems).values({
                reservationId: input.id,
                resourceCode: 'coins',
                itemType: 'alternative',
                amount: input.alternativeCoins,
            });

            const [user] = await tx.select({level: userProgress.level}).from(userProgress)
                .where(eq(userProgress.userId, input.userId)).limit(1);
            if ((user?.level ?? 0) < input.level) {
                await tx.delete(commandResourceReservations).where(eq(commandResourceReservations.id, input.id));
                return {kind: 'insufficient_level' as const, available: user?.level ?? 0, required: input.level};
            }

            const {walletId} = await ensureUserAccounts(tx, input.userId);
            const balances = await lockBalances(tx, [walletId], ['limite', 'coins']);
            const availableLimit = balances.find(row => row.resourceCode === 'limite')?.balance ?? 0;
            const availableCoins = balances.find(row => row.resourceCode === 'coins')?.balance ?? 0;
            const selection = selectCommandPayment(input, {limite: availableLimit, coins: availableCoins});
            if (!selection) {
                await tx.delete(commandResourceReservations).where(eq(commandResourceReservations.id, input.id));
                if (input.alternativeCoins > 0) return {
                    kind: 'insufficient_alternatives' as const,
                    availableLimit, requiredLimit: input.limit, availableCoins, requiredCoins: input.alternativeCoins,
                };
                if (availableLimit < input.limit) return {
                    kind: 'insufficient_limit' as const, available: availableLimit, required: input.limit,
                };
                return {kind: 'insufficient_coins' as const, available: availableCoins, required: input.coins};
            }

            const charged = [
                {resourceCode: 'limite', amount: selection.limitAmount, balance: availableLimit},
                {resourceCode: 'coins', amount: selection.coinsAmount, balance: availableCoins},
            ].filter(item => item.amount > 0);
            if (charged.length) {
                await tx.insert(commandReservationItems).values(charged.map(item => ({
                    reservationId: input.id,
                    resourceCode: item.resourceCode,
                    itemType: 'charged',
                    amount: item.amount,
                })));
                const operationId = await createFinancialOperation(tx, {
                    reason: 'command_cost', operation: input.pluginId,
                    externalId: `command:${input.id}:reserve`, actorId: input.userId,
                });
                const entries = [];
                for (const item of charged) {
                    const balanceAfter = item.balance - item.amount;
                    await updateBalance(tx, walletId, item.resourceCode, balanceAfter);
                    entries.push({accountId: walletId, resourceCode: item.resourceCode, amount: -item.amount, balanceAfter});
                }
                await insertLedgerEntries(tx, operationId, entries);
            }

            const [reserved] = await tx.update(commandResourceReservations).set({
                paymentResource: selection.paymentResource,
                updatedAt: new Date(),
            }).where(eq(commandResourceReservations.id, input.id)).returning();
            return {
                kind: 'reserved' as const,
                reservation: mapReservation(reserved!, await loadItems(tx, input.id)),
                duplicate: false,
            };
        });
    },

    async commit(id) {
        return orm.transaction(async tx => {
            const [row] = await tx.update(commandResourceReservations)
                .set({status: 'committed', updatedAt: new Date()})
                .where(and(eq(commandResourceReservations.id, id), eq(commandResourceReservations.status, 'pending')))
                .returning();
            if (!row) return null;
            const items = await loadItems(tx, id);
            const charged = items.filter(item => item.itemType === 'charged' && item.amount > 0);
            if (charged.length) {
                const reserveId = await getReserveAccountId(tx);
                const balances = await lockBalances(tx, [reserveId], charged.map(item => item.resourceCode));
                const operationId = await createFinancialOperation(tx, {
                    reason: 'command_revenue', operation: row.pluginId,
                    externalId: `command:${id}:commit`, actorId: row.userId,
                });
                const entries = [];
                for (const item of charged) {
                    const current = balances.find(balance => balance.resourceCode === item.resourceCode)?.balance ?? 0;
                    const balanceAfter = current + item.amount;
                    await updateBalance(tx, reserveId, item.resourceCode, balanceAfter);
                    entries.push({accountId: reserveId, resourceCode: item.resourceCode, amount: item.amount, balanceAfter});
                }
                await insertLedgerEntries(tx, operationId, entries);
            }
            return mapReservation(row, items);
        });
    },

    async release(id, reason) {
        return orm.transaction(async tx => {
            const [row] = await tx.update(commandResourceReservations)
                .set({status: 'released', releaseReason: reason, updatedAt: new Date()})
                .where(and(eq(commandResourceReservations.id, id), eq(commandResourceReservations.status, 'pending')))
                .returning();
            if (!row) return null;
            const items = await loadItems(tx, id);
            const charged = items.filter(item => item.itemType === 'charged' && item.amount > 0);
            if (charged.length) {
                const {walletId} = await ensureUserAccounts(tx, row.userId);
                const balances = await lockBalances(tx, [walletId], charged.map(item => item.resourceCode));
                const operationId = await createFinancialOperation(tx, {
                    reason: 'command_refund', operation: row.pluginId,
                    externalId: `command:${id}:release`, actorId: row.userId,
                });
                const entries = [];
                for (const item of charged) {
                    const current = balances.find(balance => balance.resourceCode === item.resourceCode)?.balance ?? 0;
                    const balanceAfter = current + item.amount;
                    await updateBalance(tx, walletId, item.resourceCode, balanceAfter);
                    entries.push({accountId: walletId, resourceCode: item.resourceCode, amount: item.amount, balanceAfter});
                }
                await insertLedgerEntries(tx, operationId, entries);
            }
            return mapReservation(row, items);
        });
    },

    async releaseExpired(now) {
        const expired = await orm.select({id: commandResourceReservations.id})
            .from(commandResourceReservations)
            .where(and(eq(commandResourceReservations.status, 'pending'), lte(commandResourceReservations.expiresAt, now)));
        let released = 0;
        for (const {id} of expired) if (await this.release(id, 'expired')) released++;
        return released;
    },
};
