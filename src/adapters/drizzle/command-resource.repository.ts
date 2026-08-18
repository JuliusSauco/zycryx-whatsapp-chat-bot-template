import {and, eq, lte, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {bankReserves, bankTransactions, commandResourceReservations, usuarios, userWallets, walletTransactions} from '../../db/schema.js';
import {selectCommandPayment, type CommandResourceReservation} from '../../domain/command-resources.js';
import type {CommandResourceRepository} from '../../ports/repositories.js';

type ReservationRow = typeof commandResourceReservations.$inferSelect;

function mapReservation(row: ReservationRow): CommandResourceReservation {
    return {
        id: row.id,
        userId: row.userId,
        pluginId: row.pluginId,
        messageId: row.messageId,
        limitAmount: row.limitAmount,
        coinsAmount: row.coinsAmount,
        alternativeCoinsAmount: row.alternativeCoinsAmount,
        paymentResource: row.paymentResource as CommandResourceReservation['paymentResource'],
        requiredLevel: row.requiredLevel,
        status: row.status as CommandResourceReservation['status'],
        releaseReason: row.releaseReason,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        expiresAt: row.expiresAt,
    };
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
                limitAmount: 0,
                coinsAmount: 0,
                alternativeCoinsAmount: input.alternativeCoins,
                paymentResource: 'none',
                requiredLevel: input.level,
                expiresAt: input.expiresAt,
            }).onConflictDoNothing().returning();

            if (!inserted) {
                const [existing] = await tx.select().from(commandResourceReservations)
                    .where(eq(commandResourceReservations.id, input.id)).limit(1);
                if (existing) {
                    return {kind: 'reserved' as const, reservation: mapReservation(existing), duplicate: true};
                }
                return {kind: 'not_required' as const};
            }

            const [user] = await tx.select({level: usuarios.level}).from(usuarios)
                .where(eq(usuarios.id, input.userId)).limit(1);
            if ((user?.level ?? 0) < input.level) {
                await tx.delete(commandResourceReservations).where(eq(commandResourceReservations.id, input.id));
                return {kind: 'insufficient_level' as const, available: user?.level ?? 0, required: input.level};
            }

            const [wallet] = await tx.select({limite: userWallets.limite, coins: userWallets.coins})
                .from(userWallets).where(eq(userWallets.userId, input.userId)).limit(1).for('update');
            const availableLimit = wallet?.limite ?? 0;
            const availableCoins = wallet?.coins ?? 0;
            const selection = selectCommandPayment(input, {limite: availableLimit, coins: availableCoins});
            const chargedLimit = selection?.limitAmount ?? 0;
            const chargedCoins = selection?.coinsAmount ?? 0;

            if (selection) {
                const [debited] = await tx.update(userWallets).set({
                    limite: sql`${userWallets.limite} - ${chargedLimit}`,
                    coins: sql`${userWallets.coins} - ${chargedCoins}`,
                    updatedAt: new Date(),
                }).where(eq(userWallets.userId, input.userId))
                    .returning({limite: userWallets.limite, coins: userWallets.coins});
                const [reserved] = await tx.update(commandResourceReservations).set({
                    limitAmount: chargedLimit,
                    coinsAmount: chargedCoins,
                    paymentResource: selection.paymentResource,
                    updatedAt: new Date(),
                }).where(eq(commandResourceReservations.id, input.id)).returning();
                const entries = [];
                if (chargedLimit) entries.push({userId: input.userId, resource: 'limite', amount: -chargedLimit, balanceAfter: debited!.limite, reason: 'command_cost', operation: input.pluginId, operationId: input.id});
                if (chargedCoins) entries.push({userId: input.userId, resource: 'coins', amount: -chargedCoins, balanceAfter: debited!.coins, reason: 'command_cost', operation: input.pluginId, operationId: input.id});
                if (entries.length) await tx.insert(walletTransactions).values(entries);
                return {kind: 'reserved' as const, reservation: mapReservation(reserved!), duplicate: false};
            }
            await tx.delete(commandResourceReservations).where(eq(commandResourceReservations.id, input.id));
            if (input.alternativeCoins > 0) return {
                kind: 'insufficient_alternatives' as const,
                availableLimit,
                requiredLimit: input.limit,
                availableCoins,
                requiredCoins: input.alternativeCoins,
            };
            if (availableLimit < input.limit) return {kind: 'insufficient_limit' as const, available: availableLimit, required: input.limit};
            return {kind: 'insufficient_coins' as const, available: availableCoins, required: input.coins};
        });
    },

    async commit(id) {
        return orm.transaction(async tx => {
            const [row] = await tx.update(commandResourceReservations)
                .set({status: 'committed', updatedAt: new Date()})
                .where(and(eq(commandResourceReservations.id, id), eq(commandResourceReservations.status, 'pending')))
                .returning();
            if (!row) return null;
            const revenues = [
                {resource: 'limite', amount: row.limitAmount},
                {resource: 'coins', amount: row.coinsAmount},
            ].filter(entry => entry.amount > 0);
            for (const revenue of revenues) {
                const [reserve] = await tx.update(bankReserves).set({
                    balance: sql`${bankReserves.balance} + ${revenue.amount}`,
                    updatedAt: new Date(),
                }).where(eq(bankReserves.resource, revenue.resource)).returning({balance: bankReserves.balance});
                if (!reserve) throw new Error(`Missing institutional bank reserve: ${revenue.resource}`);
                await tx.insert(bankTransactions).values({
                    userId: row.userId,
                    resource: revenue.resource,
                    type: 'command_revenue',
                    amount: revenue.amount,
                    balanceAfter: reserve.balance,
                    operationId: row.id,
                });
            }
            return mapReservation(row);
        });
    },

    async release(id, reason) {
        return orm.transaction(async tx => {
            const [row] = await tx.update(commandResourceReservations)
                .set({status: 'released', releaseReason: reason, updatedAt: new Date()})
                .where(and(eq(commandResourceReservations.id, id), eq(commandResourceReservations.status, 'pending')))
                .returning();
            if (!row) return null;
            const [refunded] = await tx.update(userWallets).set({
                limite: sql`${userWallets.limite} + ${row.limitAmount}`,
                coins: sql`${userWallets.coins} + ${row.coinsAmount}`,
                updatedAt: new Date(),
            }).where(eq(userWallets.userId, row.userId))
                .returning({limite: userWallets.limite, coins: userWallets.coins});
            if (refunded) {
                const entries = [];
                if (row.limitAmount) entries.push({userId: row.userId, resource: 'limite', amount: row.limitAmount, balanceAfter: refunded.limite, reason: 'command_refund', operation: row.pluginId, operationId: row.id});
                if (row.coinsAmount) entries.push({userId: row.userId, resource: 'coins', amount: row.coinsAmount, balanceAfter: refunded.coins, reason: 'command_refund', operation: row.pluginId, operationId: row.id});
                if (entries.length) await tx.insert(walletTransactions).values(entries);
            }
            return mapReservation(row);
        });
    },

    async releaseExpired(now) {
        const expired = await orm.select({id: commandResourceReservations.id})
            .from(commandResourceReservations)
            .where(and(eq(commandResourceReservations.status, 'pending'), lte(commandResourceReservations.expiresAt, now)));
        let released = 0;
        for (const {id} of expired) {
            if (await this.release(id, 'expired')) released++;
        }
        return released;
    },
};
