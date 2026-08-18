import {and, asc, count, eq, inArray, lte} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    economyResources, raffleEntries, raffles, raffleTickets,
    subscriptionChargeEvents, userProductSubscriptions, userProgress, usuarios,
} from '../../db/schema.js';
import {
    getSecurityDailyPrice, MAX_RAFFLE_TICKETS_PER_PURCHASE, MAX_RAFFLE_TICKETS_PER_USER, raffleTicketUnitPrice,
    RAFFLE_TICKET_PRODUCT_CODE, SECURITY_PRODUCT_CODE, SUBSCRIPTION_PERIOD_MS,
    type SecuritySubscription, type TicketPaymentResource,
} from '../../domain/store.js';
import type {WalletResource} from '../../domain/users.js';
import type {StoreRepository} from '../../ports/repositories.js';
import {randomInt} from '../../utils/random.js';
import {
    createFinancialOperation, ensureUserAccounts, getReserveAccountId, insertLedgerEntries,
    lockBalances, updateBalance, type Transaction,
} from './economy-account.helpers.js';

function mapSubscription(row: typeof userProductSubscriptions.$inferSelect): SecuritySubscription {
    return {
        userId: row.userId,
        tier: row.tier,
        status: row.status as SecuritySubscription['status'],
        dailyPriceCoins: row.dailyPriceCoins,
        paidUntil: row.paidUntil,
        nextChargeAt: row.nextChargeAt,
    };
}

async function chargeToReserve(tx: Transaction, input: {
    userId: string;
    resource: TicketPaymentResource;
    amount: number;
    reason: string;
    operation: string;
    externalId: string;
}): Promise<{operationId: string; walletAfter: number} | null> {
    const {walletId} = await ensureUserAccounts(tx, input.userId);
    const reserveId = await getReserveAccountId(tx);
    const rows = await lockBalances(tx, [walletId, reserveId], [input.resource]);
    const wallet = rows.find(row => row.accountId === walletId);
    const reserve = rows.find(row => row.accountId === reserveId);
    if (!wallet || !reserve || wallet.balance < input.amount) return null;
    const walletAfter = wallet.balance - input.amount;
    const reserveAfter = reserve.balance + input.amount;
    await updateBalance(tx, walletId, input.resource, walletAfter);
    await updateBalance(tx, reserveId, input.resource, reserveAfter);
    const operationId = await createFinancialOperation(tx, {
        reason: input.reason, operation: input.operation, externalId: input.externalId, actorId: input.userId,
    });
    await insertLedgerEntries(tx, operationId, [
        {accountId: walletId, resourceCode: input.resource, amount: -input.amount, balanceAfter: walletAfter},
        {accountId: reserveId, resourceCode: input.resource, amount: input.amount, balanceAfter: reserveAfter},
    ]);
    return {operationId, walletAfter};
}

async function renewOne(userId: string, now: Date): Promise<'paid' | 'deactivated' | 'skipped'> {
    return orm.transaction(async tx => {
        const [subscription] = await tx.select().from(userProductSubscriptions).where(and(
            eq(userProductSubscriptions.userId, userId),
            eq(userProductSubscriptions.productCode, SECURITY_PRODUCT_CODE),
        )).for('update').limit(1);
        if (!subscription || subscription.status !== 'active' || subscription.nextChargeAt > now) return 'skipped';

        const scheduledFor = subscription.nextChargeAt;
        const [progress] = await tx.select({level: userProgress.level}).from(userProgress)
            .where(eq(userProgress.userId, userId)).limit(1);
        const tier = Math.max(subscription.tier, Math.min(100, Math.max(1, progress?.level ?? 1)));
        const dailyPriceCoins = getSecurityDailyPrice(tier);
        const externalId = `subscription:${userId}:${SECURITY_PRODUCT_CODE}:${scheduledFor.toISOString()}`;
        const charge = await chargeToReserve(tx, {
            userId, resource: 'coins', amount: dailyPriceCoins,
            reason: 'subscription_charge', operation: SECURITY_PRODUCT_CODE, externalId,
        });
        if (!charge) {
            await tx.insert(subscriptionChargeEvents).values({
                userId, productCode: SECURITY_PRODUCT_CODE, scheduledFor,
                amountCoins: dailyPriceCoins, status: 'insufficient_funds',
            }).onConflictDoNothing();
            await tx.update(userProductSubscriptions).set({status: 'inactive', updatedAt: now}).where(and(
                eq(userProductSubscriptions.userId, userId),
                eq(userProductSubscriptions.productCode, SECURITY_PRODUCT_CODE),
            ));
            return 'deactivated';
        }
        const nextChargeAt = new Date(scheduledFor.getTime() + SUBSCRIPTION_PERIOD_MS);
        await tx.insert(subscriptionChargeEvents).values({
            userId, productCode: SECURITY_PRODUCT_CODE, scheduledFor,
            amountCoins: dailyPriceCoins, status: 'paid', financialOperationId: charge.operationId,
        }).onConflictDoNothing();
        await tx.update(userProductSubscriptions).set({
            tier, dailyPriceCoins, paidUntil: nextChargeAt, nextChargeAt, updatedAt: now,
        }).where(and(
            eq(userProductSubscriptions.userId, userId),
            eq(userProductSubscriptions.productCode, SECURITY_PRODUCT_CODE),
        ));
        return 'paid';
    });
}

export const storeRepository: StoreRepository = {
    async listEconomicResources() {
        const rows = await orm.select().from(economyResources).orderBy(asc(economyResources.valueInExp));
        return rows.map(row => ({
            code: row.code as WalletResource,
            displayName: row.displayName,
            pluralName: row.pluralName,
            emoji: row.emoji,
            valueInExp: row.valueInExp,
            robberyEnabled: row.robberyEnabled,
            securityEligible: row.securityEligible,
            walletEnabled: row.walletEnabled,
            bankEnabled: row.bankEnabled,
        }));
    },

    async getSecurityOverview(userId) {
        const [[progress], [subscription]] = await Promise.all([
            orm.select({level: userProgress.level}).from(userProgress).where(eq(userProgress.userId, userId)).limit(1),
            orm.select().from(userProductSubscriptions).where(and(
                eq(userProductSubscriptions.userId, userId),
                eq(userProductSubscriptions.productCode, SECURITY_PRODUCT_CODE),
            )).limit(1),
        ]);
        return {level: Math.max(0, progress?.level ?? 0), subscription: subscription ? mapSubscription(subscription) : null};
    },

    async buySecurity(userId, now, externalId) {
        return orm.transaction(async tx => {
            const [user] = await tx.select({id: usuarios.id, level: userProgress.level}).from(usuarios)
                .leftJoin(userProgress, eq(userProgress.userId, usuarios.id))
                .where(eq(usuarios.id, userId)).for('update', {of: usuarios}).limit(1);
            if (!user) return {kind: 'missing_user'} as const;
            const tier = Math.min(100, Math.max(0, user.level ?? 0));
            if (tier < 1) return {kind: 'level_too_low'} as const;
            const [existing] = await tx.select().from(userProductSubscriptions).where(and(
                eq(userProductSubscriptions.userId, userId),
                eq(userProductSubscriptions.productCode, SECURITY_PRODUCT_CODE),
            )).for('update').limit(1);
            const effectiveTier = Math.max(tier, existing?.tier ?? 0);
            const dailyPriceCoins = getSecurityDailyPrice(effectiveTier);
            const charge = await chargeToReserve(tx, {
                userId, resource: 'coins', amount: dailyPriceCoins,
                reason: 'store_purchase', operation: SECURITY_PRODUCT_CODE, externalId,
            });
            if (!charge) return {kind: 'insufficient_coins'} as const;
            const base = existing?.paidUntil && existing.paidUntil > now ? existing.paidUntil : now;
            const paidUntil = new Date(base.getTime() + SUBSCRIPTION_PERIOD_MS);
            const [saved] = await tx.insert(userProductSubscriptions).values({
                userId, productCode: SECURITY_PRODUCT_CODE, tier: effectiveTier, status: 'active',
                dailyPriceCoins, paidUntil, nextChargeAt: paidUntil, updatedAt: now,
            }).onConflictDoUpdate({
                target: [userProductSubscriptions.userId, userProductSubscriptions.productCode],
                set: {tier: effectiveTier, status: 'active', dailyPriceCoins, paidUntil, nextChargeAt: paidUntil, updatedAt: now},
            }).returning();
            await tx.insert(subscriptionChargeEvents).values({
                userId, productCode: SECURITY_PRODUCT_CODE, scheduledFor: now,
                amountCoins: dailyPriceCoins, status: 'paid', financialOperationId: charge.operationId,
            });
            return {kind: 'success', subscription: mapSubscription(saved), walletCoins: charge.walletAfter} as const;
        });
    },

    async deactivateSecurity(userId, now) {
        const rows = await orm.update(userProductSubscriptions).set({status: 'inactive', updatedAt: now}).where(and(
            eq(userProductSubscriptions.userId, userId),
            eq(userProductSubscriptions.productCode, SECURITY_PRODUCT_CODE),
            eq(userProductSubscriptions.status, 'active'),
        )).returning({userId: userProductSubscriptions.userId});
        return rows.length > 0;
    },

    async renewDueSecuritySubscriptions(now, limit) {
        const due = await orm.select({userId: userProductSubscriptions.userId}).from(userProductSubscriptions).where(and(
            eq(userProductSubscriptions.productCode, SECURITY_PRODUCT_CODE),
            eq(userProductSubscriptions.status, 'active'),
            lte(userProductSubscriptions.nextChargeAt, now),
        )).limit(limit);
        let paid = 0;
        let deactivated = 0;
        for (const row of due) {
            const result = await renewOne(row.userId, now);
            if (result === 'paid') paid++;
            if (result === 'deactivated') deactivated++;
        }
        return {paid, deactivated};
    },

    async buyRaffleTickets(input) {
        if (!Number.isSafeInteger(input.quantity) || input.quantity < 1
            || input.quantity > MAX_RAFFLE_TICKETS_PER_PURCHASE || input.codes.length !== input.quantity) {
            return {kind: 'invalid_quantity'};
        }
        return orm.transaction(async tx => {
            const [user] = await tx.select({id: usuarios.id}).from(usuarios)
                .where(eq(usuarios.id, input.userId)).for('update').limit(1);
            if (!user) return {kind: 'missing_user'} as const;
            const [owned] = await tx.select({value: count()}).from(raffleTickets).where(and(
                eq(raffleTickets.buyerId, input.userId), eq(raffleTickets.status, 'available'),
            ));
            if ((owned?.value ?? 0) + input.quantity > MAX_RAFFLE_TICKETS_PER_USER) {
                return {kind: 'invalid_quantity'} as const;
            }
            const {walletId} = await ensureUserAccounts(tx, input.userId);
            const rows = await lockBalances(tx, [walletId], ['coins', 'limite']);
            const coins = rows.find(row => row.resourceCode === 'coins')?.balance ?? 0;
            const limits = rows.find(row => row.resourceCode === 'limite')?.balance ?? 0;
            const coinTotal = raffleTicketUnitPrice('coins') * input.quantity;
            const limitTotal = raffleTicketUnitPrice('limite') * input.quantity;
            const paymentResource: TicketPaymentResource | null = input.paymentResource
                ? (input.paymentResource === 'coins' && coins >= coinTotal) || (input.paymentResource === 'limite' && limits >= limitTotal)
                    ? input.paymentResource : null
                : coins >= coinTotal ? 'coins' : limits >= limitTotal ? 'limite' : null;
            if (!paymentResource) return {kind: 'insufficient_funds'} as const;
            const unitPrice = raffleTicketUnitPrice(paymentResource);
            const total = unitPrice * input.quantity;
            const charge = await chargeToReserve(tx, {
                userId: input.userId, resource: paymentResource, amount: total,
                reason: 'store_purchase', operation: RAFFLE_TICKET_PRODUCT_CODE, externalId: input.operationId,
            });
            if (!charge) return {kind: 'insufficient_funds'} as const;
            await tx.insert(raffleTickets).values(input.codes.map(code => ({
                code, buyerId: input.userId, paymentResource, unitPrice, purchaseOperationId: charge.operationId,
            })));
            return {kind: 'success', quantity: input.quantity, paymentResource, total, codes: input.codes} as const;
        });
    },

    async listAvailableRaffleTickets(page, pageSize) {
        const offset = (page - 1) * pageSize;
        const [[total], rows] = await Promise.all([
            orm.select({value: count()}).from(raffleTickets).where(eq(raffleTickets.status, 'available')),
            orm.select({
                buyerId: raffleTickets.buyerId, buyerName: usuarios.nombre, quantity: count(),
            }).from(raffleTickets).innerJoin(usuarios, eq(usuarios.id, raffleTickets.buyerId))
                .where(eq(raffleTickets.status, 'available'))
                .groupBy(raffleTickets.buyerId, usuarios.nombre)
                .orderBy(asc(usuarios.nombre), asc(raffleTickets.buyerId)).limit(pageSize).offset(offset),
        ]);
        const [{value: totalBuyers = 0} = {value: 0}] = await orm.select({value: count()}).from(
            orm.select({buyerId: raffleTickets.buyerId}).from(raffleTickets)
                .where(eq(raffleTickets.status, 'available')).groupBy(raffleTickets.buyerId).as('raffle_buyers'),
        );
        const totalItems = total?.value ?? 0;
        return {items: rows, page, totalItems, totalPages: totalBuyers ? Math.ceil(totalBuyers / pageSize) : 0};
    },

    async drawRaffle({title, ownerId}) {
        const normalizedTitle = title.trim().replace(/\s+/g, ' ').slice(0, 120);
        if (!normalizedTitle) return {kind: 'invalid_title'};
        return orm.transaction(async tx => {
            const tickets = await tx.select().from(raffleTickets)
                .where(eq(raffleTickets.status, 'available'))
                .orderBy(asc(raffleTickets.purchasedAt), asc(raffleTickets.code)).for('update');
            if (!tickets.length) return {kind: 'empty'} as const;
            const winner = tickets[randomInt(0, tickets.length - 1)]!;
            const [raffle] = await tx.insert(raffles).values({
                title: normalizedTitle, startedBy: ownerId,
            }).returning({id: raffles.id, title: raffles.title});
            await tx.insert(raffleEntries).values(tickets.map((ticket, index) => ({
                raffleId: raffle.id, ticketId: ticket.id, position: index + 1, selected: ticket.id === winner.id,
            })));
            await tx.update(raffleTickets).set({status: 'loser'}).where(inArray(raffleTickets.id, tickets.map(ticket => ticket.id)));
            await tx.update(raffleTickets).set({status: 'winner'}).where(eq(raffleTickets.id, winner.id));
            const [buyer] = await tx.select({name: usuarios.nombre}).from(usuarios).where(eq(usuarios.id, winner.buyerId)).limit(1);
            return {
                kind: 'success', title: raffle.title, ticketCode: winner.code,
                winnerId: winner.buyerId, winnerName: buyer?.name ?? null, totalEntries: tickets.length,
            } as const;
        });
    },
};
