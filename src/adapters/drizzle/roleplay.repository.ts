import {and, asc, count, eq, inArray, isNull, lte, or} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    chats, roleplayActionMessages, roleplayChargeEvents,
    roleplayContracts, roleplaySessions, userProductEntitlements, userProgress, usuarios,
} from '../../db/schema.js';
import {
    ROLEPLAY_MAX_ACTIVE_BUYERS, ROLEPLAY_MAX_FIXED_HOURS, ROLEPLAY_PERIOD_MS,
    resolveRoleplayHourlyPrice, type RoleplayBillingEvent, type RoleplayContract,
    type RoleplayCounterparty, type RoleplaySession,
} from '../../domain/roleplay.js';
import type {RoleplayRepository} from '../../ports/repositories.js';
import {
    createFinancialOperation, ensureUserAccounts, getEscrowAccountId, getReserveAccountId,
    insertLedgerEntries, lockBalances, updateBalance, type Transaction,
} from './economy-account.helpers.js';

type SessionRow = typeof roleplaySessions.$inferSelect;
type ContractRow = typeof roleplayContracts.$inferSelect;

async function activeBuyerCount(tx: Transaction, sessionId: string): Promise<number> {
    const [row] = await tx.select({value: count()}).from(roleplayContracts).where(and(
        eq(roleplayContracts.sessionId, sessionId), eq(roleplayContracts.status, 'active'),
    ));
    return row?.value ?? 0;
}

function mapSession(row: SessionRow, buyers: number): RoleplaySession {
    return {
        id: row.id,
        roleCode: row.roleCode,
        groupId: row.groupId,
        beneficiaryId: row.beneficiaryId,
        targetId: row.targetId,
        hourlyPriceCoins: row.hourlyPriceCoins,
        beneficiaryLevel: row.beneficiaryLevel,
        pricingMode: row.pricingMode as RoleplaySession['pricingMode'],
        offerMessage: row.offerMessage,
        status: row.status as RoleplaySession['status'],
        activeBuyerCount: buyers,
        openedAt: row.openedAt,
        closedAt: row.closedAt,
    };
}

function mapContract(row: ContractRow, session: SessionRow): RoleplayContract {
    return {
        id: row.id,
        sessionId: row.sessionId,
        groupId: session.groupId,
        beneficiaryId: session.beneficiaryId,
        buyerId: row.buyerId,
        hourlyPriceCoins: session.hourlyPriceCoins,
        mode: row.mode as RoleplayContract['mode'],
        requestedHours: row.requestedHours,
        releasedHours: row.releasedHours,
        status: row.status as RoleplayContract['status'],
        startedAt: row.startedAt,
        nextChargeAt: row.nextChargeAt,
        endsAt: row.endsAt,
    };
}

async function closeSessionWhenEmpty(tx: Transaction, sessionId: string, now: Date): Promise<boolean> {
    if (await activeBuyerCount(tx, sessionId)) return false;
    const rows = await tx.update(roleplaySessions).set({status: 'closed', closedAt: now, updatedAt: now}).where(and(
        eq(roleplaySessions.id, sessionId), inArray(roleplaySessions.status, ['waiting', 'active']),
    )).returning({id: roleplaySessions.id});
    return rows.length > 0;
}

async function refundUnstartedHours(
    tx: Transaction,
    contract: ContractRow,
    session: SessionRow,
    now: Date,
    externalId: string,
): Promise<number> {
    const remainingHours = contract.mode === 'fixed'
        ? Math.max(0, (contract.requestedHours ?? 0) - contract.releasedHours)
        : 0;
    const refund = remainingHours * session.hourlyPriceCoins;
    if (!refund) return 0;
    const {walletId} = await ensureUserAccounts(tx, contract.buyerId);
    const escrowId = await getEscrowAccountId(tx);
    const balances = await lockBalances(tx, [walletId, escrowId], ['coins']);
    const wallet = balances.find(row => row.accountId === walletId);
    const escrow = balances.find(row => row.accountId === escrowId);
    if (!wallet || !escrow || escrow.balance < refund) throw new Error('Saldo de custodia insuficiente para devolver el contrato');
    const walletAfter = wallet.balance + refund;
    const escrowAfter = escrow.balance - refund;
    await updateBalance(tx, walletId, 'coins', walletAfter);
    await updateBalance(tx, escrowId, 'coins', escrowAfter);
    const operationId = await createFinancialOperation(tx, {
        reason: 'roleplay_refund', operation: session.roleCode, externalId,
        actorId: contract.buyerId, counterpartyId: session.beneficiaryId,
    });
    await insertLedgerEntries(tx, operationId, [
        {accountId: escrowId, resourceCode: 'coins', amount: -refund, balanceAfter: escrowAfter},
        {accountId: walletId, resourceCode: 'coins', amount: refund, balanceAfter: walletAfter},
    ]);
    await tx.insert(roleplayChargeEvents).values({
        contractId: contract.id, sequence: contract.releasedHours, eventType: 'refund',
        scheduledFor: now, amountCoins: refund, status: 'refunded', financialOperationId: operationId,
    });
    return refund;
}

async function loadSession(tx: Transaction, sessionId: string): Promise<SessionRow | null> {
    const [row] = await tx.select().from(roleplaySessions).where(eq(roleplaySessions.id, sessionId)).limit(1);
    return row ?? null;
}

export const roleplayRepository: RoleplayRepository = {
    async buyEntitlement(input) {
        return orm.transaction(async tx => {
            const [user] = await tx.select({id: usuarios.id}).from(usuarios)
                .where(eq(usuarios.id, input.userId)).for('update').limit(1);
            if (!user) return {kind: 'missing_user'} as const;
            const [existing] = await tx.select().from(userProductEntitlements).where(and(
                eq(userProductEntitlements.userId, input.userId),
                eq(userProductEntitlements.productCode, input.productCode),
            )).limit(1);
            const {walletId} = await ensureUserAccounts(tx, input.userId);
            const reserveId = await getReserveAccountId(tx);
            const balances = await lockBalances(tx, [walletId, reserveId], ['coins']);
            const wallet = balances.find(row => row.accountId === walletId);
            const reserve = balances.find(row => row.accountId === reserveId);
            if (!wallet || !reserve) return {kind: 'missing_user'} as const;
            if (existing) return {kind: 'success', alreadyOwned: true, walletCoins: wallet.balance} as const;
            if (wallet.balance < input.priceCoins) return {kind: 'insufficient_wallet'} as const;
            const walletAfter = wallet.balance - input.priceCoins;
            const reserveAfter = reserve.balance + input.priceCoins;
            await updateBalance(tx, walletId, 'coins', walletAfter);
            await updateBalance(tx, reserveId, 'coins', reserveAfter);
            const operationId = await createFinancialOperation(tx, {
                reason: 'store_purchase', operation: input.productCode, externalId: input.operationId,
                actorId: input.userId,
            });
            await insertLedgerEntries(tx, operationId, [
                {accountId: walletId, resourceCode: 'coins', amount: -input.priceCoins, balanceAfter: walletAfter},
                {accountId: reserveId, resourceCode: 'coins', amount: input.priceCoins, balanceAfter: reserveAfter},
            ]);
            await tx.insert(userProductEntitlements).values({
                userId: input.userId, productCode: input.productCode,
                purchaseOperationId: operationId, acquiredAt: input.now,
            });
            return {kind: 'success', alreadyOwned: false, walletCoins: walletAfter} as const;
        });
    },

    async hasEntitlement(userId, productCode) {
        const [row] = await orm.select({userId: userProductEntitlements.userId}).from(userProductEntitlements).where(and(
            eq(userProductEntitlements.userId, userId), eq(userProductEntitlements.productCode, productCode),
        )).limit(1);
        return Boolean(row);
    },

    async openSession(input) {
        return orm.transaction(async tx => {
            const [user] = await tx.select({id: usuarios.id, level: userProgress.level}).from(usuarios)
                .leftJoin(userProgress, eq(userProgress.userId, usuarios.id))
                .where(eq(usuarios.id, input.beneficiaryId)).for('update', {of: usuarios}).limit(1);
            if (!user) return {kind: 'missing_user'} as const;
            const [entitlement] = await tx.select({userId: userProductEntitlements.userId}).from(userProductEntitlements).where(and(
                eq(userProductEntitlements.userId, input.beneficiaryId),
                eq(userProductEntitlements.productCode, input.productCode),
            )).limit(1);
            if (!entitlement) return {kind: 'missing_entitlement'} as const;
            if (input.targetId) {
                if (input.targetId === input.beneficiaryId) return {kind: 'invalid_target'} as const;
                const [target] = await tx.select({id: usuarios.id}).from(usuarios).where(eq(usuarios.id, input.targetId)).limit(1);
                if (!target) return {kind: 'invalid_target'} as const;
            }
            const pricing = resolveRoleplayHourlyPrice(user.level ?? 0, input.requestedPriceCoins);
            if (pricing.kind !== 'success') return pricing;
            await tx.insert(chats).values({id: input.groupId, isGroup: true}).onConflictDoNothing();
            const [created] = await tx.insert(roleplaySessions).values({
                roleCode: input.roleCode,
                groupId: input.groupId,
                beneficiaryId: input.beneficiaryId,
                targetId: input.targetId,
                hourlyPriceCoins: pricing.price,
                beneficiaryLevel: user.level ?? 0,
                pricingMode: pricing.pricingMode,
                offerMessage: input.offerMessage,
                openedAt: input.now,
                updatedAt: input.now,
            }).onConflictDoNothing().returning();
            if (!created) return {kind: 'session_already_open'} as const;
            return {kind: 'success', session: mapSession(created, 0)} as const;
        });
    },

    async getSession(sessionId) {
        const [row] = await orm.select().from(roleplaySessions).where(eq(roleplaySessions.id, sessionId)).limit(1);
        if (!row) return null;
        return mapSession(row, await activeBuyerCount(orm as unknown as Transaction, row.id));
    },

    async findOpenSession(input) {
        const [row] = await orm.select().from(roleplaySessions).where(and(
            eq(roleplaySessions.groupId, input.groupId),
            eq(roleplaySessions.beneficiaryId, input.beneficiaryId),
            eq(roleplaySessions.roleCode, input.roleCode),
            inArray(roleplaySessions.status, ['waiting', 'active']),
        )).orderBy(asc(roleplaySessions.openedAt)).limit(1);
        if (!row) return null;
        return mapSession(row, await activeBuyerCount(orm as unknown as Transaction, row.id));
    },

    async listAvailableSessions(input) {
        const rows = await orm.select().from(roleplaySessions).where(and(
            eq(roleplaySessions.groupId, input.groupId),
            eq(roleplaySessions.roleCode, input.roleCode),
            inArray(roleplaySessions.status, ['waiting', 'active']),
            or(eq(roleplaySessions.targetId, input.buyerId), isNull(roleplaySessions.targetId)),
        )).orderBy(asc(roleplaySessions.openedAt));
        const available = rows.filter(row => row.targetId === null || row.targetId === input.buyerId);
        return Promise.all(available.map(async row => mapSession(row, await activeBuyerCount(orm as unknown as Transaction, row.id))));
    },

    async acceptSession(input) {
        return orm.transaction(async tx => {
            const [session] = await tx.select().from(roleplaySessions).where(eq(roleplaySessions.id, input.sessionId)).for('update').limit(1);
            if (!session || !['waiting', 'active'].includes(session.status)) return {kind: 'session_not_found'} as const;
            if (session.beneficiaryId === input.buyerId) return {kind: 'self_contract'} as const;
            if (session.targetId && session.targetId !== input.buyerId) return {kind: 'not_targeted_user'} as const;
            const [buyer] = await tx.select({id: usuarios.id}).from(usuarios).where(eq(usuarios.id, input.buyerId)).for('update').limit(1);
            if (!buyer) return {kind: 'missing_user'} as const;
            if (input.mode === 'fixed' && (!input.hours || input.hours < 1 || input.hours > ROLEPLAY_MAX_FIXED_HOURS)) {
                return {kind: 'invalid_hours', maximum: ROLEPLAY_MAX_FIXED_HOURS} as const;
            }
            const [existing] = await tx.select({id: roleplayContracts.id}).from(roleplayContracts).where(and(
                eq(roleplayContracts.sessionId, session.id), eq(roleplayContracts.buyerId, input.buyerId),
                eq(roleplayContracts.status, 'active'),
            )).limit(1);
            if (existing) return {kind: 'already_active'} as const;
            if (await activeBuyerCount(tx, session.id) >= ROLEPLAY_MAX_ACTIVE_BUYERS) return {kind: 'session_full'} as const;

            const prepaidCoins = session.hourlyPriceCoins * (input.mode === 'fixed' ? input.hours! : 1);
            if (!Number.isSafeInteger(prepaidCoins)) return {kind: 'invalid_hours', maximum: ROLEPLAY_MAX_FIXED_HOURS} as const;
            const buyerAccounts = await ensureUserAccounts(tx, input.buyerId);
            const beneficiaryAccounts = await ensureUserAccounts(tx, session.beneficiaryId);
            const escrowId = await getEscrowAccountId(tx);
            const balances = await lockBalances(tx, [buyerAccounts.walletId, beneficiaryAccounts.walletId, escrowId], ['coins']);
            const buyerWallet = balances.find(row => row.accountId === buyerAccounts.walletId);
            const beneficiaryWallet = balances.find(row => row.accountId === beneficiaryAccounts.walletId);
            const escrow = balances.find(row => row.accountId === escrowId);
            if (!buyerWallet || !beneficiaryWallet || !escrow) return {kind: 'missing_user'} as const;
            if (buyerWallet.balance < prepaidCoins) return {kind: 'insufficient_wallet'} as const;

            const buyerAfter = buyerWallet.balance - prepaidCoins;
            const beneficiaryAfter = beneficiaryWallet.balance + session.hourlyPriceCoins;
            const heldCoins = prepaidCoins - session.hourlyPriceCoins;
            const escrowAfter = escrow.balance + heldCoins;
            await updateBalance(tx, buyerAccounts.walletId, 'coins', buyerAfter);
            await updateBalance(tx, beneficiaryAccounts.walletId, 'coins', beneficiaryAfter);
            if (heldCoins) await updateBalance(tx, escrowId, 'coins', escrowAfter);
            const operationId = await createFinancialOperation(tx, {
                reason: 'roleplay_prepayment', operation: session.roleCode, externalId: input.operationId,
                actorId: input.buyerId, counterpartyId: session.beneficiaryId,
            });
            await insertLedgerEntries(tx, operationId, [
                {accountId: buyerAccounts.walletId, resourceCode: 'coins', amount: -prepaidCoins, balanceAfter: buyerAfter},
                {accountId: beneficiaryAccounts.walletId, resourceCode: 'coins', amount: session.hourlyPriceCoins, balanceAfter: beneficiaryAfter},
                ...(heldCoins ? [{accountId: escrowId, resourceCode: 'coins', amount: heldCoins, balanceAfter: escrowAfter}] : []),
            ]);
            const nextChargeAt = new Date(input.now.getTime() + ROLEPLAY_PERIOD_MS);
            const endsAt = input.mode === 'fixed' ? new Date(input.now.getTime() + input.hours! * ROLEPLAY_PERIOD_MS) : null;
            const [contractRow] = await tx.insert(roleplayContracts).values({
                sessionId: session.id, buyerId: input.buyerId, mode: input.mode,
                requestedHours: input.mode === 'fixed' ? input.hours : null,
                releasedHours: 1, startedAt: input.now, nextChargeAt, endsAt,
                updatedAt: input.now,
            }).returning();
            await tx.insert(roleplayChargeEvents).values({
                contractId: contractRow.id, sequence: 1,
                eventType: input.mode === 'fixed' ? 'prepayment' : 'hourly_charge',
                scheduledFor: input.now, amountCoins: prepaidCoins,
                status: 'paid', financialOperationId: operationId,
            });
            const [updatedSession] = await tx.update(roleplaySessions).set({
                status: 'active', acceptedOnce: true, updatedAt: input.now,
            }).where(eq(roleplaySessions.id, session.id)).returning();
            const buyers = await activeBuyerCount(tx, session.id);
            return {
                kind: 'success', contract: mapContract(contractRow, updatedSession),
                session: mapSession(updatedSession, buyers), walletCoins: buyerAfter, prepaidCoins,
            } as const;
        });
    },

    async acceptAll(input) {
        return orm.transaction(async tx => {
            const sessions = (await tx.select().from(roleplaySessions).where(and(
                eq(roleplaySessions.groupId, input.groupId), eq(roleplaySessions.roleCode, input.roleCode),
                inArray(roleplaySessions.status, ['waiting', 'active']),
            )).orderBy(asc(roleplaySessions.openedAt)).for('update'))
                .filter(row => row.beneficiaryId !== input.buyerId && (row.targetId === null || row.targetId === input.buyerId));
            if (!sessions.length) return {kind: 'none'} as const;
            const selected: SessionRow[] = [];
            for (const session of sessions) {
                const [existing] = await tx.select({id: roleplayContracts.id}).from(roleplayContracts).where(and(
                    eq(roleplayContracts.sessionId, session.id), eq(roleplayContracts.buyerId, input.buyerId),
                    eq(roleplayContracts.status, 'active'),
                )).limit(1);
                if (existing) continue;
                if (await activeBuyerCount(tx, session.id) >= ROLEPLAY_MAX_ACTIVE_BUYERS) return {kind: 'session_full'} as const;
                selected.push(session);
            }
            if (!selected.length) return {kind: 'none'} as const;
            if (input.operationIds.length < selected.length) throw new Error('Faltan identificadores para aceptar todas las sesiones');
            const totalCoins = selected.reduce((sum, session) => sum + session.hourlyPriceCoins, 0);
            const buyerAccounts = await ensureUserAccounts(tx, input.buyerId);
            const beneficiaryAccounts = new Map<string, string>();
            for (const session of selected) {
                beneficiaryAccounts.set(session.beneficiaryId, (await ensureUserAccounts(tx, session.beneficiaryId)).walletId);
            }
            const accountIds = [buyerAccounts.walletId, ...beneficiaryAccounts.values()];
            const balances = await lockBalances(tx, accountIds, ['coins']);
            const buyerWallet = balances.find(row => row.accountId === buyerAccounts.walletId);
            if (!buyerWallet || buyerWallet.balance < totalCoins) return {kind: 'insufficient_wallet'} as const;
            let buyerAfter = buyerWallet.balance;
            const providerBalances = new Map<string, number>();
            for (const [beneficiaryId, accountId] of beneficiaryAccounts) {
                providerBalances.set(beneficiaryId, balances.find(row => row.accountId === accountId)?.balance ?? 0);
            }
            const contracts: RoleplayContract[] = [];
            for (let index = 0; index < selected.length; index++) {
                const session = selected[index]!;
                const providerAccountId = beneficiaryAccounts.get(session.beneficiaryId)!;
                buyerAfter -= session.hourlyPriceCoins;
                const providerAfter = (providerBalances.get(session.beneficiaryId) ?? 0) + session.hourlyPriceCoins;
                providerBalances.set(session.beneficiaryId, providerAfter);
                await updateBalance(tx, buyerAccounts.walletId, 'coins', buyerAfter);
                await updateBalance(tx, providerAccountId, 'coins', providerAfter);
                const operationId = await createFinancialOperation(tx, {
                    reason: 'roleplay_prepayment', operation: session.roleCode,
                    externalId: input.operationIds[index], actorId: input.buyerId,
                    counterpartyId: session.beneficiaryId,
                });
                await insertLedgerEntries(tx, operationId, [
                    {accountId: buyerAccounts.walletId, resourceCode: 'coins', amount: -session.hourlyPriceCoins, balanceAfter: buyerAfter},
                    {accountId: providerAccountId, resourceCode: 'coins', amount: session.hourlyPriceCoins, balanceAfter: providerAfter},
                ]);
                const nextChargeAt = new Date(input.now.getTime() + ROLEPLAY_PERIOD_MS);
                const [contract] = await tx.insert(roleplayContracts).values({
                    sessionId: session.id, buyerId: input.buyerId, mode: 'fixed', requestedHours: 1,
                    releasedHours: 1, startedAt: input.now, nextChargeAt, endsAt: nextChargeAt,
                    updatedAt: input.now,
                }).returning();
                await tx.insert(roleplayChargeEvents).values({
                    contractId: contract.id, sequence: 1, eventType: 'prepayment', scheduledFor: input.now,
                    amountCoins: session.hourlyPriceCoins, status: 'paid', financialOperationId: operationId,
                });
                await tx.update(roleplaySessions).set({status: 'active', acceptedOnce: true, updatedAt: input.now})
                    .where(eq(roleplaySessions.id, session.id));
                contracts.push(mapContract(contract, {...session, status: 'active', acceptedOnce: true, updatedAt: input.now}));
            }
            return {kind: 'success', contracts, totalCoins, walletCoins: buyerAfter} as const;
        });
    },

    async endContracts(input) {
        return orm.transaction(async tx => {
            let rows = await tx.select({contract: roleplayContracts, session: roleplaySessions})
                .from(roleplayContracts).innerJoin(roleplaySessions, eq(roleplaySessions.id, roleplayContracts.sessionId))
                .where(and(
                    eq(roleplaySessions.groupId, input.groupId), eq(roleplaySessions.roleCode, input.roleCode),
                    eq(roleplayContracts.status, 'active'),
                    or(eq(roleplayContracts.buyerId, input.actorId), eq(roleplaySessions.beneficiaryId, input.actorId)),
                )).for('update', {of: roleplayContracts});
            if (input.quotedMessageId) {
                const [action] = await tx.select({contractId: roleplayActionMessages.contractId}).from(roleplayActionMessages)
                    .where(eq(roleplayActionMessages.messageId, input.quotedMessageId)).limit(1);
                rows = action ? rows.filter(row => row.contract.id === action.contractId) : [];
            }
            if (input.counterpartyId) {
                rows = rows.filter(row => row.contract.buyerId === input.counterpartyId
                    || row.session.beneficiaryId === input.counterpartyId);
            }
            if (!input.counterpartyId && !input.quotedMessageId) {
                const ownSessionRows = rows.filter(row => row.session.beneficiaryId === input.actorId);
                if (ownSessionRows.length) rows = ownSessionRows;
            }
            if (!rows.length) {
                if (!input.counterpartyId && !input.quotedMessageId) {
                    const closed = await tx.update(roleplaySessions).set({
                        status: 'closed', closedAt: input.now, updatedAt: input.now,
                    }).where(and(
                        eq(roleplaySessions.groupId, input.groupId),
                        eq(roleplaySessions.roleCode, input.roleCode),
                        eq(roleplaySessions.beneficiaryId, input.actorId),
                        inArray(roleplaySessions.status, ['waiting', 'active']),
                    )).returning({id: roleplaySessions.id});
                    if (closed.length) return {kind: 'success', endedContracts: 0, refundedCoins: 0, sessionClosed: true} as const;
                }
                return {kind: 'not_found'} as const;
            }
            const actorIsBeneficiary = rows.every(row => row.session.beneficiaryId === input.actorId);
            if (!actorIsBeneficiary && rows.length > 1 && !input.counterpartyId && !input.quotedMessageId) {
                return {kind: 'ambiguous'} as const;
            }
            let refundedCoins = 0;
            const affectedSessions = new Set<string>();
            for (const row of rows) {
                refundedCoins += await refundUnstartedHours(
                    tx, row.contract, row.session, input.now, `${input.operationId}:${row.contract.id}`,
                );
                await tx.update(roleplayContracts).set({
                    status: 'cancelled', endedAt: input.now, endedBy: input.actorId,
                    endReason: actorIsBeneficiary ? 'beneficiary_ended' : 'buyer_ended', updatedAt: input.now,
                }).where(and(eq(roleplayContracts.id, row.contract.id), eq(roleplayContracts.status, 'active')));
                affectedSessions.add(row.session.id);
            }
            let sessionClosed = false;
            for (const sessionId of affectedSessions) {
                if (await closeSessionWhenEmpty(tx, sessionId, input.now)) sessionClosed = true;
            }
            return {kind: 'success', endedContracts: rows.length, refundedCoins, sessionClosed} as const;
        });
    },

    async listActiveCounterparties(input) {
        const rows = await orm.select({contract: roleplayContracts, session: roleplaySessions})
            .from(roleplayContracts).innerJoin(roleplaySessions, eq(roleplaySessions.id, roleplayContracts.sessionId))
            .where(and(
                eq(roleplaySessions.groupId, input.groupId), eq(roleplaySessions.roleCode, input.roleCode),
                eq(roleplayContracts.status, 'active'),
                or(eq(roleplayContracts.buyerId, input.actorId), eq(roleplaySessions.beneficiaryId, input.actorId)),
            ));
        return rows.map(row => ({
            contract: mapContract(row.contract, row.session),
            counterpartyId: row.contract.buyerId === input.actorId ? row.session.beneficiaryId : row.contract.buyerId,
            actorRole: row.contract.buyerId === input.actorId ? 'buyer' : 'beneficiary',
        } satisfies RoleplayCounterparty));
    },

    async recordActionMessage(input) {
        await orm.insert(roleplayActionMessages).values(input).onConflictDoNothing();
    },

    async findActionContract(input) {
        const [row] = await orm.select({action: roleplayActionMessages, contract: roleplayContracts, session: roleplaySessions})
            .from(roleplayActionMessages)
            .innerJoin(roleplayContracts, eq(roleplayContracts.id, roleplayActionMessages.contractId))
            .innerJoin(roleplaySessions, eq(roleplaySessions.id, roleplayContracts.sessionId))
            .where(and(
                eq(roleplayActionMessages.messageId, input.messageId),
                eq(roleplayActionMessages.targetId, input.actorId),
                eq(roleplayContracts.status, 'active'),
            )).limit(1);
        if (!row) return null;
        return {
            contract: mapContract(row.contract, row.session),
            counterpartyId: row.action.actorId,
            actorRole: row.contract.buyerId === input.actorId ? 'buyer' : 'beneficiary',
            actionCode: row.action.actionCode,
        };
    },

    async processDueContracts(now, limit) {
        const due = await orm.select({id: roleplayContracts.id}).from(roleplayContracts).where(and(
            eq(roleplayContracts.status, 'active'), lte(roleplayContracts.nextChargeAt, now),
        )).orderBy(asc(roleplayContracts.nextChargeAt)).limit(limit);
        const events: RoleplayBillingEvent[] = [];
        for (const {id} of due) {
            const event = await orm.transaction(async tx => {
                const [row] = await tx.select({contract: roleplayContracts, session: roleplaySessions})
                    .from(roleplayContracts).innerJoin(roleplaySessions, eq(roleplaySessions.id, roleplayContracts.sessionId))
                    .where(eq(roleplayContracts.id, id)).for('update', {of: roleplayContracts}).limit(1);
                if (!row || row.contract.status !== 'active' || row.contract.nextChargeAt > now) return null;
                const {contract, session} = row;
                if (contract.mode === 'fixed' && contract.releasedHours >= (contract.requestedHours ?? 0)) {
                    await tx.update(roleplayContracts).set({
                        status: 'completed', endedAt: now, endReason: 'time_completed', updatedAt: now,
                    }).where(eq(roleplayContracts.id, contract.id));
                    await closeSessionWhenEmpty(tx, session.id, now);
                    return {
                        kind: 'completed', contractId: contract.id, sessionId: session.id,
                        groupId: session.groupId, beneficiaryId: session.beneficiaryId, buyerId: contract.buyerId,
                        hourlyPriceCoins: session.hourlyPriceCoins, releasedHours: contract.releasedHours,
                    } satisfies RoleplayBillingEvent;
                }

                const beneficiaryAccounts = await ensureUserAccounts(tx, session.beneficiaryId);
                let sourceAccountId: string;
                if (contract.mode === 'fixed') {
                    sourceAccountId = await getEscrowAccountId(tx);
                } else {
                    sourceAccountId = (await ensureUserAccounts(tx, contract.buyerId)).walletId;
                }
                const balances = await lockBalances(tx, [sourceAccountId, beneficiaryAccounts.walletId], ['coins']);
                const source = balances.find(balance => balance.accountId === sourceAccountId);
                const beneficiary = balances.find(balance => balance.accountId === beneficiaryAccounts.walletId);
                if (!source || !beneficiary) throw new Error('No se pudieron cargar los balances del contrato');
                if (source.balance < session.hourlyPriceCoins) {
                    await tx.update(roleplayContracts).set({
                        status: 'insufficient_funds', endedAt: now,
                        endReason: contract.mode === 'fixed' ? 'escrow_inconsistent' : 'insufficient_wallet', updatedAt: now,
                    }).where(eq(roleplayContracts.id, contract.id));
                    await tx.insert(roleplayChargeEvents).values({
                        contractId: contract.id, sequence: contract.releasedHours + 1,
                        eventType: contract.mode === 'fixed' ? 'hourly_release' : 'hourly_charge',
                        scheduledFor: contract.nextChargeAt, amountCoins: session.hourlyPriceCoins,
                        status: 'insufficient_funds',
                    }).onConflictDoNothing();
                    await closeSessionWhenEmpty(tx, session.id, now);
                    return {
                        kind: 'insufficient_funds', contractId: contract.id, sessionId: session.id,
                        groupId: session.groupId, beneficiaryId: session.beneficiaryId, buyerId: contract.buyerId,
                        hourlyPriceCoins: session.hourlyPriceCoins, releasedHours: contract.releasedHours,
                    } satisfies RoleplayBillingEvent;
                }
                const sourceAfter = source.balance - session.hourlyPriceCoins;
                const beneficiaryAfter = beneficiary.balance + session.hourlyPriceCoins;
                await updateBalance(tx, sourceAccountId, 'coins', sourceAfter);
                await updateBalance(tx, beneficiaryAccounts.walletId, 'coins', beneficiaryAfter);
                const sequence = contract.releasedHours + 1;
                const operationId = await createFinancialOperation(tx, {
                    reason: contract.mode === 'fixed' ? 'roleplay_hourly_release' : 'roleplay_hourly_charge',
                    operation: session.roleCode, externalId: `roleplay:${contract.id}:hour:${sequence}`,
                    actorId: contract.buyerId, counterpartyId: session.beneficiaryId,
                });
                await insertLedgerEntries(tx, operationId, [
                    {accountId: sourceAccountId, resourceCode: 'coins', amount: -session.hourlyPriceCoins, balanceAfter: sourceAfter},
                    {accountId: beneficiaryAccounts.walletId, resourceCode: 'coins', amount: session.hourlyPriceCoins, balanceAfter: beneficiaryAfter},
                ]);
                await tx.insert(roleplayChargeEvents).values({
                    contractId: contract.id, sequence,
                    eventType: contract.mode === 'fixed' ? 'hourly_release' : 'hourly_charge',
                    scheduledFor: contract.nextChargeAt, amountCoins: session.hourlyPriceCoins,
                    status: 'paid', financialOperationId: operationId,
                });
                const nextChargeAt = new Date(contract.nextChargeAt.getTime() + ROLEPLAY_PERIOD_MS);
                await tx.update(roleplayContracts).set({releasedHours: sequence, nextChargeAt, updatedAt: now})
                    .where(eq(roleplayContracts.id, contract.id));
                return {
                    kind: contract.mode === 'fixed' ? 'released' : 'charged',
                    contractId: contract.id, sessionId: session.id,
                    groupId: session.groupId, beneficiaryId: session.beneficiaryId, buyerId: contract.buyerId,
                    hourlyPriceCoins: session.hourlyPriceCoins, releasedHours: sequence,
                } satisfies RoleplayBillingEvent;
            });
            if (event) events.push(event);
        }
        return events;
    },

    async cleanExpiredActionMessages(now) {
        const rows = await orm.delete(roleplayActionMessages).where(lte(roleplayActionMessages.expiresAt, now))
            .returning({messageId: roleplayActionMessages.messageId});
        return rows.length;
    },
};
