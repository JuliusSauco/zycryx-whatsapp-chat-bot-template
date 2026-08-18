import {and, asc, eq, inArray, or, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    bankLoanPayments,
    bankLoans,
    bankExchangeRates,
    bankReserves,
    bankTransactions,
    userBankAccounts,
    userWallets,
    usuarios,
    walletTransactions,
} from '../../db/schema.js';
import {
    allocateLoanPayment,
    BANK_RESOURCES,
    calculateLoanInterest,
    calculateExchangeQuote,
    getLoanCreditLimit,
    getLoanStatus,
    LOAN_GRACE_MS,
    LOAN_TERM_MS,
    MIN_LOAN_AMOUNT,
    MIN_LOAN_LEVEL,
    type BankLoan,
    type BankLoanStatus,
    type BankResource,
    isBankResource,
} from '../../domain/bank.js';
import type {WalletResource} from '../../domain/users.js';
import type {BankRepository} from '../../ports/repositories.js';

const MAX_INTEGER = 2_147_483_647;
const outstandingStatuses: BankLoanStatus[] = ['active', 'overdue', 'defaulted'];

function mapLoan(row: typeof bankLoans.$inferSelect): BankLoan {
    return {
        id: row.id,
        userId: row.userId,
        principal: row.principal,
        interestAmount: row.interestAmount,
        principalOutstanding: row.principalOutstanding,
        interestOutstanding: row.interestOutstanding,
        status: row.status as BankLoanStatus,
        issuedAt: row.issuedAt,
        dueAt: row.dueAt,
        defaultAt: row.defaultAt,
        paidAt: row.paidAt,
    };
}

function balances(row?: Pick<typeof userBankAccounts.$inferSelect, BankResource>) {
    return {
        limite: row?.limite ?? 0,
        coins: row?.coins ?? 0,
        botcoin: row?.botcoin ?? 0,
        zyxcoin: row?.zyxcoin ?? 0,
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

async function refreshUserLoan(
    tx: Parameters<Parameters<typeof orm.transaction>[0]>[0],
    userId: string,
    now: Date,
) {
    const [loan] = await tx.select().from(bankLoans)
        .where(and(eq(bankLoans.userId, userId), inArray(bankLoans.status, outstandingStatuses)))
        .for('update').limit(1);
    if (!loan) return null;
    const status = getLoanStatus(loan.status as BankLoanStatus, loan.dueAt, loan.defaultAt, now);
    if (status !== loan.status) {
        const [updated] = await tx.update(bankLoans).set({status, updatedAt: now})
            .where(eq(bankLoans.id, loan.id)).returning();
        return updated;
    }
    return loan;
}

export const bankRepository: BankRepository = {
    async ensureAccount(userId) {
        await orm.insert(userBankAccounts).values({userId}).onConflictDoNothing();
    },

    async getOverview(userId, now) {
        return orm.transaction(async tx => {
            const [account] = await tx.select().from(userBankAccounts)
                .where(eq(userBankAccounts.userId, userId)).limit(1);
            const loan = await refreshUserLoan(tx, userId, now);
            return {balances: balances(account), loan: loan ? mapLoan(loan) : null};
        });
    },

    async transferCustody({userId, resource, direction, amount, operationId}) {
        return orm.transaction(async tx => {
            const [wallet] = await tx.select().from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            const [account] = await tx.select().from(userBankAccounts)
                .where(eq(userBankAccounts.userId, userId)).for('update').limit(1);
            if (!wallet || !account) return {kind: 'missing_account'} as const;
            if (account.status !== 'active') return {kind: 'inactive_account'} as const;
            const source = direction === 'deposit' ? wallet[resource] : account[resource];
            const applied = amount === 'all' ? source : amount;
            if (!Number.isInteger(applied) || applied <= 0 || source < applied) {
                return {kind: direction === 'deposit' ? 'insufficient_wallet' : 'insufficient_bank'} as const;
            }
            const walletAfter = wallet[resource] + (direction === 'deposit' ? -applied : applied);
            const bankAfter = account[resource] + (direction === 'deposit' ? applied : -applied);
            if (walletAfter > MAX_INTEGER || bankAfter > MAX_INTEGER) return {kind: 'overflow'} as const;
            await tx.update(userWallets).set({[resource]: walletAfter, updatedAt: new Date()})
                .where(eq(userWallets.userId, userId));
            await tx.update(userBankAccounts).set({[resource]: bankAfter, updatedAt: new Date()})
                .where(eq(userBankAccounts.userId, userId));
            await tx.insert(walletTransactions).values({
                userId,
                resource,
                amount: direction === 'deposit' ? -applied : applied,
                balanceAfter: walletAfter,
                reason: 'bank_transfer',
                operation: direction,
                operationId,
            });
            await tx.insert(bankTransactions).values({
                userId,
                resource,
                type: direction,
                amount: direction === 'deposit' ? applied : -applied,
                balanceAfter: bankAfter,
                operationId,
            });
            return {kind: 'success', amount: applied, walletBalance: walletAfter, bankBalance: bankAfter} as const;
        });
    },

    async getReserves() {
        const rows = await orm.select().from(bankReserves);
        const result = {limite: 0, coins: 0, botcoin: 0, zyxcoin: 0};
        for (const row of rows) if (BANK_RESOURCES.includes(row.resource as BankResource)) {
            result[row.resource as BankResource] = row.balance;
        }
        return result;
    },

    async adjustReserve({actorId, resource, amount, operationId}) {
        if (!Number.isSafeInteger(amount) || amount === 0) return null;
        return orm.transaction(async tx => {
            const [reserve] = await tx.select().from(bankReserves)
                .where(eq(bankReserves.resource, resource)).for('update').limit(1);
            if (!reserve || reserve.balance + amount < 0 || !Number.isSafeInteger(reserve.balance + amount)) return null;
            const balance = reserve.balance + amount;
            await tx.update(bankReserves).set({balance, updatedAt: new Date()})
                .where(eq(bankReserves.resource, resource));
            await tx.insert(bankTransactions).values({
                actorId, resource, type: 'owner_adjustment', amount, balanceAfter: balance, operationId,
            });
            return balance;
        });
    },

    async listExchangeRates() {
        const rows = await orm.select().from(bankExchangeRates)
            .where(eq(bankExchangeRates.active, true))
            .orderBy(asc(bankExchangeRates.sourceResource), asc(bankExchangeRates.targetResource));
        return rows.map(mapExchangeRate);
    },

    async exchangeCurrency({userId, sourceResource, targetResource, amount, operationId}) {
        return orm.transaction(async tx => {
            const [rateRow] = await tx.select().from(bankExchangeRates).where(and(
                eq(bankExchangeRates.sourceResource, sourceResource),
                eq(bankExchangeRates.targetResource, targetResource),
                eq(bankExchangeRates.active, true),
            )).limit(1);
            if (!rateRow) return {kind: 'unavailable_pair'} as const;
            const rate = mapExchangeRate(rateRow);
            const [wallet] = await tx.select().from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            if (!wallet) return {kind: 'insufficient_wallet'} as const;

            const quote = calculateExchangeQuote(rate, amount, wallet[sourceResource]);
            if (quote.kind !== 'success') return quote;
            const {sourceSpent, targetReceived} = quote;

            const reserveResources: BankResource[] = [targetResource];
            const sourceBankResource = isBankResource(sourceResource) ? sourceResource : null;
            if (sourceBankResource) reserveResources.push(sourceBankResource);
            const reserves = await tx.select().from(bankReserves)
                .where(inArray(bankReserves.resource, reserveResources))
                .orderBy(asc(bankReserves.resource)).for('update');
            const targetReserve = reserves.find(row => row.resource === targetResource);
            const sourceReserve = sourceBankResource
                ? reserves.find(row => row.resource === sourceBankResource)
                : null;
            if (!targetReserve || targetReserve.balance < targetReceived) {
                return {kind: 'insufficient_reserve'} as const;
            }
            if (sourceBankResource && !sourceReserve) return {kind: 'insufficient_reserve'} as const;

            const sourceBalance = wallet[sourceResource] - sourceSpent;
            const targetBalance = wallet[targetResource] + targetReceived;
            const targetReserveBalance = targetReserve.balance - targetReceived;
            const sourceReserveBalance = sourceReserve ? sourceReserve.balance + sourceSpent : null;
            if (targetBalance > MAX_INTEGER || (sourceReserveBalance !== null && !Number.isSafeInteger(sourceReserveBalance))) {
                return {kind: 'overflow'} as const;
            }

            await tx.update(userWallets).set({
                [sourceResource]: sourceBalance,
                [targetResource]: targetBalance,
                updatedAt: new Date(),
            }).where(eq(userWallets.userId, userId));
            if (sourceBankResource && sourceReserveBalance !== null) {
                await tx.update(bankReserves).set({balance: sourceReserveBalance, updatedAt: new Date()})
                    .where(eq(bankReserves.resource, sourceBankResource));
            }
            await tx.update(bankReserves).set({balance: targetReserveBalance, updatedAt: new Date()})
                .where(eq(bankReserves.resource, targetResource));
            await tx.insert(walletTransactions).values([
                {
                    userId, resource: sourceResource, amount: -sourceSpent, balanceAfter: sourceBalance,
                    reason: 'currency_exchange', operation: 'exchange', operationId,
                },
                {
                    userId, resource: targetResource, amount: targetReceived, balanceAfter: targetBalance,
                    reason: 'currency_exchange', operation: 'exchange', operationId,
                },
            ]);
            const bankEntries: Array<typeof bankTransactions.$inferInsert> = [];
            if (sourceBankResource && sourceReserveBalance !== null) bankEntries.push({
                userId, resource: sourceBankResource, type: 'currency_exchange_in', amount: sourceSpent,
                balanceAfter: sourceReserveBalance, operationId,
            });
            bankEntries.push({
                userId, resource: targetResource, type: 'currency_exchange_out', amount: -targetReceived,
                balanceAfter: targetReserveBalance, operationId,
            });
            await tx.insert(bankTransactions).values(bankEntries);
            return {kind: 'success', rate, sourceSpent, targetReceived, sourceBalance, targetBalance} as const;
        });
    },

    async requestLoan({userId, amount, now, operationId}) {
        return orm.transaction(async tx => {
            const [user] = await tx.select({registered: usuarios.registered, level: usuarios.level})
                .from(usuarios).where(eq(usuarios.id, userId)).for('update').limit(1);
            if (!user?.registered) return {kind: 'not_registered'} as const;
            const level = user.level ?? 0;
            if (level < MIN_LOAN_LEVEL) return {kind: 'level_too_low', level} as const;
            if (!Number.isInteger(amount) || amount < MIN_LOAN_AMOUNT) {
                return {kind: 'invalid_amount', minimum: MIN_LOAN_AMOUNT} as const;
            }
            const creditLimit = getLoanCreditLimit(level);
            if (amount > creditLimit) return {kind: 'over_credit_limit', creditLimit} as const;
            if (await refreshUserLoan(tx, userId, now)) return {kind: 'existing_loan'} as const;
            const [wallet] = await tx.select().from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            if (!wallet || wallet.coins + amount > MAX_INTEGER) return {kind: 'insufficient_reserve'} as const;
            const [reserve] = await tx.select().from(bankReserves)
                .where(eq(bankReserves.resource, 'coins')).for('update').limit(1);
            if (!reserve || reserve.balance < amount) return {kind: 'insufficient_reserve'} as const;
            const interestAmount = calculateLoanInterest(amount);
            const dueAt = new Date(now.getTime() + LOAN_TERM_MS);
            const defaultAt = new Date(dueAt.getTime() + LOAN_GRACE_MS);
            const [loan] = await tx.insert(bankLoans).values({
                userId,
                principal: amount,
                interestAmount,
                principalOutstanding: amount,
                interestOutstanding: interestAmount,
                issuedAt: now,
                dueAt,
                defaultAt,
                updatedAt: now,
            }).returning();
            const reserveAfter = reserve.balance - amount;
            const walletAfter = wallet.coins + amount;
            await tx.update(bankReserves).set({balance: reserveAfter, updatedAt: now})
                .where(eq(bankReserves.resource, 'coins'));
            await tx.update(userWallets).set({coins: walletAfter, updatedAt: now})
                .where(eq(userWallets.userId, userId));
            await tx.insert(walletTransactions).values({
                userId, resource: 'coins', amount, balanceAfter: walletAfter,
                reason: 'loan_disbursement', operation: 'loan_request', operationId,
            });
            await tx.insert(bankTransactions).values({
                userId, resource: 'coins', type: 'loan_disbursement', amount: -amount,
                balanceAfter: reserveAfter, operationId, loanId: loan.id,
            });
            return {kind: 'success', loan: mapLoan(loan), walletBalance: walletAfter, reserveBalance: reserveAfter} as const;
        });
    },

    async payLoan({userId, amount, now, operationId}) {
        return orm.transaction(async tx => {
            const loan = await refreshUserLoan(tx, userId, now);
            if (!loan) return {kind: 'no_loan'} as const;
            const [wallet] = await tx.select().from(userWallets)
                .where(eq(userWallets.userId, userId)).for('update').limit(1);
            const [reserve] = await tx.select().from(bankReserves)
                .where(eq(bankReserves.resource, 'coins')).for('update').limit(1);
            const total = loan.interestOutstanding + loan.principalOutstanding;
            const requested = amount === 'all' ? total : amount;
            if (!wallet || !reserve || !Number.isInteger(requested) || requested <= 0) {
                return {kind: 'insufficient_wallet'} as const;
            }
            const allocation = allocateLoanPayment(requested, loan.interestOutstanding, loan.principalOutstanding);
            if (wallet.coins < allocation.amount) return {kind: 'insufficient_wallet'} as const;
            const walletAfter = wallet.coins - allocation.amount;
            const reserveAfter = reserve.balance + allocation.amount;
            if (!Number.isSafeInteger(reserveAfter)) return {kind: 'insufficient_wallet'} as const;
            const paid = allocation.interestAfter === 0 && allocation.principalAfter === 0;
            const [updatedLoan] = await tx.update(bankLoans).set({
                interestOutstanding: allocation.interestAfter,
                principalOutstanding: allocation.principalAfter,
                status: paid ? 'paid' : getLoanStatus(loan.status as BankLoanStatus, loan.dueAt, loan.defaultAt, now),
                paidAt: paid ? now : null,
                updatedAt: now,
            }).where(eq(bankLoans.id, loan.id)).returning();
            await tx.update(userWallets).set({coins: walletAfter, updatedAt: now})
                .where(eq(userWallets.userId, userId));
            await tx.update(bankReserves).set({balance: reserveAfter, updatedAt: now})
                .where(eq(bankReserves.resource, 'coins'));
            const [walletTx] = await tx.insert(walletTransactions).values({
                userId, resource: 'coins', amount: -allocation.amount, balanceAfter: walletAfter,
                reason: 'loan_payment', operation: 'loan_pay', operationId,
            }).returning({id: walletTransactions.id});
            const [bankTx] = await tx.insert(bankTransactions).values({
                userId, resource: 'coins', type: 'loan_payment', amount: allocation.amount,
                balanceAfter: reserveAfter, operationId, loanId: loan.id,
            }).returning({id: bankTransactions.id});
            await tx.insert(bankLoanPayments).values({
                loanId: loan.id,
                amount: allocation.amount,
                principalPaid: allocation.principalPaid,
                interestPaid: allocation.interestPaid,
                walletTransactionId: walletTx.id,
                bankTransactionId: bankTx.id,
                createdAt: now,
            });
            return {
                kind: 'success', loan: mapLoan(updatedLoan), amount: allocation.amount,
                interestPaid: allocation.interestPaid, principalPaid: allocation.principalPaid,
                walletBalance: walletAfter,
            } as const;
        });
    },

    async refreshLoanStatuses(now) {
        const updated = await orm.update(bankLoans).set({
            status: sql`CASE WHEN ${bankLoans.defaultAt} <= ${now} THEN 'defaulted' ELSE 'overdue' END`,
            updatedAt: now,
        }).where(or(
            and(eq(bankLoans.status, 'active'), sql`${bankLoans.dueAt} <= ${now}`),
            and(eq(bankLoans.status, 'overdue'), sql`${bankLoans.defaultAt} <= ${now}`),
        )).returning({id: bankLoans.id});
        return updated.length;
    },
};
