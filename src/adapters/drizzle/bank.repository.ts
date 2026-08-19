import {and, asc, count, desc, eq, inArray, or, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    accountBalances, bankExchangeRates, bankLoanPayments, bankLoans, financialAccounts,
    financialOperations, ledgerEntries,
    userProgress, userRegistrations, usuarios,
} from '../../db/schema.js';
import {
    allocateLoanPayment, BANK_RESOURCES, calculateExchangeQuote, calculateLoanInterest,
    getLoanCreditLimit, getLoanStatus, isBankResource, LOAN_GRACE_MS, LOAN_TERM_MS,
    MIN_LOAN_AMOUNT, MIN_LOAN_LEVEL, type BankLoan, type BankLoanStatus, type BankResource,
} from '../../domain/bank.js';
import type {WalletResource} from '../../domain/users.js';
import type {BankRepository} from '../../ports/repositories.js';
import {
    createFinancialOperation, ensureUserAccounts, getAccountId, getReserveAccountId,
    insertLedgerEntries, lockBalances, mapBalanceRows, updateBalance, type Transaction,
} from './economy-account.helpers.js';

const MAX_INTEGER = 2_147_483_647;
const outstandingStatuses: BankLoanStatus[] = ['active', 'overdue', 'defaulted'];

function mapLoan(row: typeof bankLoans.$inferSelect): BankLoan {
    return {
        id: row.id, userId: row.userId, principal: row.principal, interestAmount: row.interestAmount,
        principalOutstanding: row.principalOutstanding, interestOutstanding: row.interestOutstanding,
        status: row.status as BankLoanStatus, issuedAt: row.issuedAt, dueAt: row.dueAt,
        defaultAt: row.defaultAt, paidAt: row.paidAt,
    };
}

function mapExchangeRate(row: typeof bankExchangeRates.$inferSelect) {
    return {
        sourceResource: row.sourceResource as WalletResource,
        targetResource: row.targetResource as BankResource,
        sourceAmount: row.sourceAmount,
        targetAmount: row.targetAmount,
        active: row.active,
    };
}

async function refreshUserLoan(tx: Transaction, userId: string, now: Date) {
    const [loan] = await tx.select().from(bankLoans)
        .where(and(eq(bankLoans.userId, userId), inArray(bankLoans.status, outstandingStatuses)))
        .for('update').limit(1);
    if (!loan) return null;
    const status = getLoanStatus(loan.status as BankLoanStatus, loan.dueAt, loan.defaultAt, now);
    if (status === loan.status) return loan;
    const [updated] = await tx.update(bankLoans).set({status, updatedAt: now})
        .where(eq(bankLoans.id, loan.id)).returning();
    return updated;
}

export const bankRepository: BankRepository = {
    async ensureAccount(userId) {
        await orm.transaction(tx => ensureUserAccounts(tx, userId, 'bank_account_creation'));
    },

    async getOverview(userId, now) {
        return orm.transaction(async tx => {
            const bankId = await getAccountId(tx, userId, 'bank');
            const rows = bankId
                ? await tx.select({resourceCode: accountBalances.resourceCode, balance: accountBalances.balance})
                    .from(accountBalances).where(eq(accountBalances.accountId, bankId))
                : [];
            const mapped = mapBalanceRows(rows);
            const loan = await refreshUserLoan(tx, userId, now);
            return {
                balances: {limite: mapped.limite, coins: mapped.coins, botcoin: mapped.botcoin, zyxcoin: mapped.zyxcoin},
                loan: loan ? mapLoan(loan) : null,
            };
        });
    },

    async transferCustody({userId, resource, direction, amount, operationId: externalId}) {
        return orm.transaction(async tx => {
            const accounts = await tx.select({id: financialAccounts.id, type: financialAccounts.accountType, status: financialAccounts.status})
                .from(financialAccounts).where(and(eq(financialAccounts.userId, userId), inArray(financialAccounts.accountType, ['wallet', 'bank'])));
            const wallet = accounts.find(row => row.type === 'wallet');
            const bank = accounts.find(row => row.type === 'bank');
            if (!wallet || !bank) return {kind: 'missing_account'} as const;
            if (bank.status !== 'active') return {kind: 'inactive_account'} as const;
            const rows = await lockBalances(tx, [wallet.id, bank.id], [resource]);
            const walletBalance = rows.find(row => row.accountId === wallet.id);
            const bankBalance = rows.find(row => row.accountId === bank.id);
            if (!walletBalance || !bankBalance) return {kind: 'missing_account'} as const;
            const source = direction === 'deposit' ? walletBalance.balance : bankBalance.balance;
            const applied = amount === 'all' ? source : amount;
            if (!Number.isInteger(applied) || applied <= 0 || source < applied) {
                return {kind: direction === 'deposit' ? 'insufficient_wallet' : 'insufficient_bank'} as const;
            }
            const walletAfter = walletBalance.balance + (direction === 'deposit' ? -applied : applied);
            const bankAfter = bankBalance.balance + (direction === 'deposit' ? applied : -applied);
            if (walletAfter > MAX_INTEGER || bankAfter > MAX_INTEGER) return {kind: 'overflow'} as const;
            await updateBalance(tx, wallet.id, resource, walletAfter);
            await updateBalance(tx, bank.id, resource, bankAfter);
            const operationId = await createFinancialOperation(tx, {
                reason: 'bank_transfer', operation: direction, externalId, actorId: userId,
            });
            await insertLedgerEntries(tx, operationId, [
                {accountId: wallet.id, resourceCode: resource, amount: direction === 'deposit' ? -applied : applied, balanceAfter: walletAfter},
                {accountId: bank.id, resourceCode: resource, amount: direction === 'deposit' ? applied : -applied, balanceAfter: bankAfter},
            ]);
            return {kind: 'success', amount: applied, walletBalance: walletAfter, bankBalance: bankAfter} as const;
        });
    },

    async transferBetweenAccounts({from, to, resource, amount, operationId: externalId}) {
        if (from === to) return {kind: 'same_user'} as const;
        if (!Number.isSafeInteger(amount) || amount <= 0) return {kind: 'invalid_amount'} as const;
        return orm.transaction(async tx => {
            const accounts = await tx.select({
                id: financialAccounts.id,
                userId: financialAccounts.userId,
                status: financialAccounts.status,
            }).from(financialAccounts).where(and(
                inArray(financialAccounts.userId, [from, to]),
                eq(financialAccounts.accountType, 'bank'),
            ));
            const sender = accounts.find(row => row.userId === from);
            const receiver = accounts.find(row => row.userId === to);
            if (!sender || !receiver) return {kind: 'missing_account'} as const;
            if (sender.status !== 'active' || receiver.status !== 'active') return {kind: 'inactive_account'} as const;
            const rows = await lockBalances(tx, [sender.id, receiver.id], [resource]);
            const senderBalance = rows.find(row => row.accountId === sender.id);
            const receiverBalance = rows.find(row => row.accountId === receiver.id);
            if (!senderBalance || !receiverBalance) return {kind: 'missing_account'} as const;
            if (senderBalance.balance < amount) return {kind: 'insufficient_bank'} as const;
            const senderAfter = senderBalance.balance - amount;
            const receiverAfter = receiverBalance.balance + amount;
            if (!Number.isSafeInteger(receiverAfter) || receiverAfter > MAX_INTEGER) return {kind: 'overflow'} as const;
            await updateBalance(tx, sender.id, resource, senderAfter);
            await updateBalance(tx, receiver.id, resource, receiverAfter);
            const operationId = await createFinancialOperation(tx, {
                reason: 'bank_transfer', operation: 'transfer', externalId, actorId: from, counterpartyId: to,
            });
            await insertLedgerEntries(tx, operationId, [
                {accountId: sender.id, resourceCode: resource, amount: -amount, balanceAfter: senderAfter},
                {accountId: receiver.id, resourceCode: resource, amount, balanceAfter: receiverAfter},
            ]);
            return {kind: 'success', amount, senderBankBalance: senderAfter, receiverBankBalance: receiverAfter} as const;
        });
    },

    async listTransferHistory(userId, page, pageSize) {
        const offset = (page - 1) * pageSize;
        const where = and(
            eq(financialAccounts.userId, userId),
            eq(financialAccounts.accountType, 'bank'),
            eq(financialOperations.reason, 'bank_transfer'),
            eq(financialOperations.operation, 'transfer'),
        );
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
            items: rows.map(row => ({...row, resource: row.resource as BankResource})),
            page, pageSize, totalItems, totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
        };
    },

    async getReserves() {
        return orm.transaction(async tx => {
            const reserveId = await getReserveAccountId(tx);
            const rows = await tx.select({resourceCode: accountBalances.resourceCode, balance: accountBalances.balance})
                .from(accountBalances).where(eq(accountBalances.accountId, reserveId));
            const mapped = mapBalanceRows(rows);
            return {limite: mapped.limite, coins: mapped.coins, botcoin: mapped.botcoin, zyxcoin: mapped.zyxcoin};
        });
    },

    async adjustReserve({actorId, resource, amount, operationId: externalId}) {
        if (!Number.isSafeInteger(amount) || amount === 0) return null;
        return orm.transaction(async tx => {
            const reserveId = await getReserveAccountId(tx);
            const [current] = await lockBalances(tx, [reserveId], [resource]);
            if (!current || current.balance + amount < 0 || !Number.isSafeInteger(current.balance + amount)) return null;
            const balance = current.balance + amount;
            await updateBalance(tx, reserveId, resource, balance);
            const operationId = await createFinancialOperation(tx, {
                reason: 'admin_adjustment', operation: 'owner_adjustment', externalId, actorId,
            });
            await insertLedgerEntries(tx, operationId, [{accountId: reserveId, resourceCode: resource, amount, balanceAfter: balance}]);
            return balance;
        });
    },

    async listExchangeRates() {
        const rows = await orm.select().from(bankExchangeRates).where(eq(bankExchangeRates.active, true))
            .orderBy(asc(bankExchangeRates.sourceResource), asc(bankExchangeRates.targetResource));
        return rows.map(mapExchangeRate);
    },

    async exchangeCurrency({userId, sourceResource, targetResource, amount, operationId: externalId}) {
        return orm.transaction(async tx => {
            const [rateRow] = await tx.select().from(bankExchangeRates).where(and(
                eq(bankExchangeRates.sourceResource, sourceResource),
                eq(bankExchangeRates.targetResource, targetResource),
                eq(bankExchangeRates.active, true),
            )).limit(1);
            if (!rateRow) return {kind: 'unavailable_pair'} as const;
            const rate = mapExchangeRate(rateRow);
            const walletId = await getAccountId(tx, userId, 'wallet');
            if (!walletId) return {kind: 'insufficient_wallet'} as const;
            const reserveId = await getReserveAccountId(tx);
            const resources = [...new Set([sourceResource, targetResource])];
            const rows = await lockBalances(tx, [walletId, reserveId], resources);
            const walletSource = rows.find(row => row.accountId === walletId && row.resourceCode === sourceResource);
            const walletTarget = rows.find(row => row.accountId === walletId && row.resourceCode === targetResource);
            const targetReserve = rows.find(row => row.accountId === reserveId && row.resourceCode === targetResource);
            const sourceBankResource = isBankResource(sourceResource) ? sourceResource : null;
            const sourceReserve = sourceBankResource
                ? rows.find(row => row.accountId === reserveId && row.resourceCode === sourceBankResource)
                : null;
            if (!walletSource || !walletTarget) return {kind: 'insufficient_wallet'} as const;
            const quote = calculateExchangeQuote(rate, amount, walletSource.balance);
            if (quote.kind !== 'success') return quote;
            const {sourceSpent, targetReceived} = quote;
            if (!targetReserve || targetReserve.balance < targetReceived || (sourceBankResource && !sourceReserve)) {
                return {kind: 'insufficient_reserve'} as const;
            }
            const sourceBalance = walletSource.balance - sourceSpent;
            const targetBalance = walletTarget.balance + targetReceived;
            const targetReserveBalance = targetReserve.balance - targetReceived;
            const sourceReserveBalance = sourceReserve ? sourceReserve.balance + sourceSpent : null;
            if (targetBalance > MAX_INTEGER || (sourceReserveBalance !== null && !Number.isSafeInteger(sourceReserveBalance))) {
                return {kind: 'overflow'} as const;
            }
            await updateBalance(tx, walletId, sourceResource, sourceBalance);
            await updateBalance(tx, walletId, targetResource, targetBalance);
            await updateBalance(tx, reserveId, targetResource, targetReserveBalance);
            if (sourceBankResource && sourceReserveBalance !== null) await updateBalance(tx, reserveId, sourceBankResource, sourceReserveBalance);
            const operationId = await createFinancialOperation(tx, {
                reason: 'currency_exchange', operation: 'exchange', externalId, actorId: userId,
            });
            const entries = [
                {accountId: walletId, resourceCode: sourceResource, amount: -sourceSpent, balanceAfter: sourceBalance},
                {accountId: walletId, resourceCode: targetResource, amount: targetReceived, balanceAfter: targetBalance},
                {accountId: reserveId, resourceCode: targetResource, amount: -targetReceived, balanceAfter: targetReserveBalance},
            ];
            if (sourceBankResource && sourceReserveBalance !== null) entries.push({
                accountId: reserveId, resourceCode: sourceBankResource, amount: sourceSpent, balanceAfter: sourceReserveBalance,
            });
            await insertLedgerEntries(tx, operationId, entries);
            return {kind: 'success', rate, sourceSpent, targetReceived, sourceBalance, targetBalance} as const;
        });
    },

    async requestLoan({userId, amount, now, operationId: externalId}) {
        return orm.transaction(async tx => {
            const [user] = await tx.select({
                registered: sql<boolean>`${userRegistrations.userId} IS NOT NULL`, level: userProgress.level,
            }).from(usuarios)
                .leftJoin(userRegistrations, eq(userRegistrations.userId, usuarios.id))
                .leftJoin(userProgress, eq(userProgress.userId, usuarios.id))
                .where(eq(usuarios.id, userId)).for('update', {of: usuarios}).limit(1);
            if (!user?.registered) return {kind: 'not_registered'} as const;
            const level = user.level ?? 0;
            if (level < MIN_LOAN_LEVEL) return {kind: 'level_too_low', level} as const;
            if (!Number.isInteger(amount) || amount < MIN_LOAN_AMOUNT) return {kind: 'invalid_amount', minimum: MIN_LOAN_AMOUNT} as const;
            const creditLimit = getLoanCreditLimit(level);
            if (amount > creditLimit) return {kind: 'over_credit_limit', creditLimit} as const;
            if (await refreshUserLoan(tx, userId, now)) return {kind: 'existing_loan'} as const;
            const walletId = await getAccountId(tx, userId, 'wallet');
            const reserveId = await getReserveAccountId(tx);
            if (!walletId) return {kind: 'insufficient_reserve'} as const;
            const rows = await lockBalances(tx, [walletId, reserveId], ['coins']);
            const wallet = rows.find(row => row.accountId === walletId);
            const reserve = rows.find(row => row.accountId === reserveId);
            if (!wallet || !reserve || reserve.balance < amount || wallet.balance + amount > MAX_INTEGER) return {kind: 'insufficient_reserve'} as const;
            const interestAmount = calculateLoanInterest(amount);
            const dueAt = new Date(now.getTime() + LOAN_TERM_MS);
            const defaultAt = new Date(dueAt.getTime() + LOAN_GRACE_MS);
            const [loan] = await tx.insert(bankLoans).values({
                userId, principal: amount, interestAmount, principalOutstanding: amount,
                interestOutstanding: interestAmount, issuedAt: now, dueAt, defaultAt, updatedAt: now,
            }).returning();
            const reserveAfter = reserve.balance - amount;
            const walletAfter = wallet.balance + amount;
            await updateBalance(tx, reserveId, 'coins', reserveAfter);
            await updateBalance(tx, walletId, 'coins', walletAfter);
            const operationId = await createFinancialOperation(tx, {
                reason: 'loan_disbursement', operation: 'loan_request', externalId, actorId: userId,
            });
            await insertLedgerEntries(tx, operationId, [
                {accountId: reserveId, resourceCode: 'coins', amount: -amount, balanceAfter: reserveAfter},
                {accountId: walletId, resourceCode: 'coins', amount, balanceAfter: walletAfter},
            ]);
            return {kind: 'success', loan: mapLoan(loan), walletBalance: walletAfter, reserveBalance: reserveAfter} as const;
        });
    },

    async payLoan({userId, amount, now, operationId: externalId}) {
        return orm.transaction(async tx => {
            const loan = await refreshUserLoan(tx, userId, now);
            if (!loan) return {kind: 'no_loan'} as const;
            const walletId = await getAccountId(tx, userId, 'wallet');
            const reserveId = await getReserveAccountId(tx);
            if (!walletId) return {kind: 'insufficient_wallet'} as const;
            const rows = await lockBalances(tx, [walletId, reserveId], ['coins']);
            const wallet = rows.find(row => row.accountId === walletId);
            const reserve = rows.find(row => row.accountId === reserveId);
            const total = loan.interestOutstanding + loan.principalOutstanding;
            const requested = amount === 'all' ? total : amount;
            if (!wallet || !reserve || !Number.isInteger(requested) || requested <= 0) return {kind: 'insufficient_wallet'} as const;
            const allocation = allocateLoanPayment(requested, loan.interestOutstanding, loan.principalOutstanding);
            if (wallet.balance < allocation.amount) return {kind: 'insufficient_wallet'} as const;
            const walletAfter = wallet.balance - allocation.amount;
            const reserveAfter = reserve.balance + allocation.amount;
            const paid = allocation.interestAfter === 0 && allocation.principalAfter === 0;
            const [updatedLoan] = await tx.update(bankLoans).set({
                interestOutstanding: allocation.interestAfter,
                principalOutstanding: allocation.principalAfter,
                status: paid ? 'paid' : getLoanStatus(loan.status as BankLoanStatus, loan.dueAt, loan.defaultAt, now),
                paidAt: paid ? now : null,
                updatedAt: now,
            }).where(eq(bankLoans.id, loan.id)).returning();
            await updateBalance(tx, walletId, 'coins', walletAfter);
            await updateBalance(tx, reserveId, 'coins', reserveAfter);
            const operationId = await createFinancialOperation(tx, {
                reason: 'loan_payment', operation: 'loan_pay', externalId, actorId: userId,
            });
            const entries = await insertLedgerEntries(tx, operationId, [
                {accountId: walletId, resourceCode: 'coins', amount: -allocation.amount, balanceAfter: walletAfter},
                {accountId: reserveId, resourceCode: 'coins', amount: allocation.amount, balanceAfter: reserveAfter},
            ]);
            if (!entries[0] || !entries[1]) throw new Error('Asientos incompletos para pago de préstamo');
            await tx.insert(bankLoanPayments).values({
                loanId: loan.id, amount: allocation.amount, principalPaid: allocation.principalPaid,
                interestPaid: allocation.interestPaid, walletLedgerEntryId: entries[0].id,
                reserveLedgerEntryId: entries[1].id, createdAt: now,
            });
            return {kind: 'success', loan: mapLoan(updatedLoan), amount: allocation.amount,
                interestPaid: allocation.interestPaid, principalPaid: allocation.principalPaid,
                walletBalance: walletAfter} as const;
        });
    },

    async refreshLoanStatuses(now) {
        const updated = await orm.update(bankLoans).set({
            status: sql`CASE WHEN ${bankLoans.defaultAt} <= ${now} THEN 'defaulted' ELSE 'overdue' END`, updatedAt: now,
        }).where(or(
            and(eq(bankLoans.status, 'active'), sql`${bankLoans.dueAt} <= ${now}`),
            and(eq(bankLoans.status, 'overdue'), sql`${bankLoans.defaultAt} <= ${now}`),
        )).returning({id: bankLoans.id});
        return updated.length;
    },
};
