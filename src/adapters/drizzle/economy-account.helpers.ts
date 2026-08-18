import {and, eq, inArray, sql} from 'drizzle-orm';
import {orm} from '../../db/client.js';
import {
    accountBalances,
    financialAccounts,
    financialOperations,
    ledgerEntries,
} from '../../db/schema.js';
import type {WalletResource, WalletTransactionReason} from '../../domain/users.js';

export type Transaction = Parameters<Parameters<typeof orm.transaction>[0]>[0];
export type AccountType = 'wallet' | 'bank' | 'reserve';

export const WALLET_RESOURCES: readonly WalletResource[] = ['limite', 'exp', 'coins', 'botcoin', 'zyxcoin'];
export const BANK_RESOURCE_CODES = ['limite', 'coins', 'botcoin', 'zyxcoin'] as const;

const INITIAL_WALLET_BALANCES: Record<WalletResource, number> = {
    limite: 10,
    exp: 0,
    coins: 100,
    botcoin: 0,
    zyxcoin: 0,
};

export function emptyBalances(): Record<WalletResource, number> {
    return {limite: 0, exp: 0, coins: 0, botcoin: 0, zyxcoin: 0};
}

export function mapBalanceRows(rows: Array<{resourceCode: string; balance: number}>): Record<WalletResource, number> {
    const result = emptyBalances();
    for (const row of rows) {
        if (WALLET_RESOURCES.includes(row.resourceCode as WalletResource)) {
            result[row.resourceCode as WalletResource] = Number(row.balance);
        }
    }
    return result;
}

export async function ensureUserAccounts(tx: Transaction, userId: string, openingOperation = 'account_creation'): Promise<{walletId: string; bankId: string}> {
    const [existingWallet] = await tx.select({id: financialAccounts.id}).from(financialAccounts).where(and(
        eq(financialAccounts.userId, userId), eq(financialAccounts.accountType, 'wallet'),
    )).limit(1);
    const [wallet] = await tx.insert(financialAccounts).values({userId, accountType: 'wallet'})
        .onConflictDoUpdate({
            target: [financialAccounts.userId, financialAccounts.accountType],
            set: {updatedAt: new Date()},
        }).returning({id: financialAccounts.id});
    const [bank] = await tx.insert(financialAccounts).values({userId, accountType: 'bank'})
        .onConflictDoUpdate({
            target: [financialAccounts.userId, financialAccounts.accountType],
            set: {updatedAt: new Date()},
        }).returning({id: financialAccounts.id});
    await tx.insert(accountBalances).values(WALLET_RESOURCES.map(resourceCode => ({
        accountId: wallet.id,
        resourceCode,
        balance: INITIAL_WALLET_BALANCES[resourceCode],
    }))).onConflictDoNothing();
    await tx.insert(accountBalances).values(BANK_RESOURCE_CODES.map(resourceCode => ({
        accountId: bank.id,
        resourceCode,
        balance: 0,
    }))).onConflictDoNothing();
    if (!existingWallet) {
        const operationId = await createFinancialOperation(tx, {
            reason: 'opening_balance', operation: openingOperation, actorId: userId,
        });
        await insertLedgerEntries(tx, operationId, WALLET_RESOURCES
            .filter(resourceCode => INITIAL_WALLET_BALANCES[resourceCode] > 0)
            .map(resourceCode => ({
                accountId: wallet.id,
                resourceCode,
                amount: INITIAL_WALLET_BALANCES[resourceCode],
                balanceAfter: INITIAL_WALLET_BALANCES[resourceCode],
            })));
    }
    return {walletId: wallet.id, bankId: bank.id};
}

export async function getAccountId(
    tx: Transaction,
    userId: string,
    accountType: Exclude<AccountType, 'reserve'>,
): Promise<string | null> {
    const [row] = await tx.select({id: financialAccounts.id}).from(financialAccounts).where(and(
        eq(financialAccounts.userId, userId), eq(financialAccounts.accountType, accountType),
    )).limit(1);
    return row?.id ?? null;
}

export async function getReserveAccountId(tx: Transaction): Promise<string> {
    const [existing] = await tx.select({id: financialAccounts.id}).from(financialAccounts)
        .where(and(eq(financialAccounts.accountType, 'reserve'), sql`${financialAccounts.userId} IS NULL`)).limit(1);
    if (existing) return existing.id;
    await tx.insert(financialAccounts).values({accountType: 'reserve'}).onConflictDoNothing();
    const [created] = await tx.select({id: financialAccounts.id}).from(financialAccounts)
        .where(and(eq(financialAccounts.accountType, 'reserve'), sql`${financialAccounts.userId} IS NULL`)).limit(1);
    if (!created) throw new Error('No se pudo crear la cuenta de reserva');
    await tx.insert(accountBalances).values(BANK_RESOURCE_CODES.map(resourceCode => ({
        accountId: created.id, resourceCode, balance: 0,
    }))).onConflictDoNothing();
    return created.id;
}

export async function lockBalances(
    tx: Transaction,
    accountIds: string[],
    resources: string[],
): Promise<Array<{accountId: string; resourceCode: string; balance: number}>> {
    if (!accountIds.length || !resources.length) return [];
    return tx.select({
        accountId: accountBalances.accountId,
        resourceCode: accountBalances.resourceCode,
        balance: accountBalances.balance,
    }).from(accountBalances).where(and(
        inArray(accountBalances.accountId, accountIds),
        inArray(accountBalances.resourceCode, resources),
    )).orderBy(accountBalances.accountId, accountBalances.resourceCode).for('update');
}

export async function updateBalance(
    tx: Transaction,
    accountId: string,
    resourceCode: string,
    balance: number,
): Promise<void> {
    await tx.update(accountBalances).set({balance, updatedAt: new Date()}).where(and(
        eq(accountBalances.accountId, accountId), eq(accountBalances.resourceCode, resourceCode),
    ));
}

export async function createFinancialOperation(tx: Transaction, input: {
    reason: WalletTransactionReason | string;
    operation?: string | null;
    externalId?: string | null;
    actorId?: string | null;
    counterpartyId?: string | null;
}): Promise<string> {
    const [row] = await tx.insert(financialOperations).values({
        reason: input.reason,
        operation: input.operation ?? null,
        externalId: input.externalId ?? null,
        actorId: input.actorId ?? null,
        counterpartyId: input.counterpartyId ?? null,
    }).returning({id: financialOperations.id});
    return row.id;
}

export async function insertLedgerEntries(tx: Transaction, operationId: string, entries: Array<{
    accountId: string;
    resourceCode: string;
    amount: number;
    balanceAfter: number;
}>): Promise<Array<{id: number}>> {
    if (!entries.length) return [];
    return tx.insert(ledgerEntries).values(entries.map(entry => ({...entry, operationId})))
        .returning({id: ledgerEntries.id});
}
