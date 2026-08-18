import {randomUUID} from 'node:crypto';
import type {
    RewardTimestampField,
    TransferableWalletResource,
    WalletTransferHistoryPage,
    UserWallet,
    WalletResource,
    WalletTransactionReason,
} from '../domain/users.js';
import type {RobExperienceInput, RobExperienceResult} from '../domain/robbery.js';
import {repositories} from './data-source.js';

export const WALLET_RESOURCES: WalletResource[] = ['limite', 'exp', 'coins', 'botcoin', 'zyxcoin'];
export const TRANSFERABLE_WALLET_RESOURCES: TransferableWalletResource[] = ['limite', 'exp', 'coins'];

export function isWalletResource(value: string): value is WalletResource {
    return WALLET_RESOURCES.includes(value as WalletResource);
}

export function isTransferableWalletResource(value: string): value is TransferableWalletResource {
    return TRANSFERABLE_WALLET_RESOURCES.includes(value as TransferableWalletResource);
}

export async function getWallet(userId: string): Promise<UserWallet | null> {
    return repositories.users.findWallet(userId);
}

export async function listWallets(): Promise<UserWallet[]> {
    return repositories.users.listWallets();
}

export async function addWalletResource(
    userId: string,
    resource: WalletResource,
    amount: number,
    reason: WalletTransactionReason = 'other',
    operation?: string,
): Promise<number | null> {
    return repositories.users.addWalletResource(userId, resource, amount, reason, operation);
}

export async function addWalletResourceAndSetWait(
    userId: string,
    resource: WalletResource,
    amount: number,
    wait: number,
    reason: WalletTransactionReason = 'other',
    operation?: string,
): Promise<number | null> {
    return repositories.users.addWalletResourceAndSetWait(userId, resource, amount, wait, reason, operation);
}

export async function addWalletResourcesAndSetFields(input: {
    userId: string;
    resources: Partial<Record<WalletResource, number>>;
    fields: Partial<Record<RewardTimestampField, number>>;
    reason?: WalletTransactionReason;
    operation?: string;
}): Promise<void> {
    await repositories.users.addWalletResourcesAndSetFields({...input, reason: input.reason ?? 'other'});
}

export async function exchangeWalletResources(input: {
    userId: string;
    from: WalletResource;
    to: WalletResource;
    fromAmount: number;
    toAmount: number;
    reason?: WalletTransactionReason;
    operation?: string;
}): Promise<boolean> {
    return repositories.users.exchangeWalletResources({...input, reason: input.reason ?? 'other'});
}

export async function transferWalletResource(input: {
    from: string;
    to: string;
    resource: TransferableWalletResource;
    amount: number;
    reason?: WalletTransactionReason;
    operation?: string;
}): Promise<boolean> {
    return repositories.users.transferWalletResource({
        ...input,
        reason: input.reason ?? 'transfer',
        operationId: randomUUID(),
    });
}

export function listWalletTransferHistory(userId: string, page: number, pageSize = 10): Promise<WalletTransferHistoryPage> {
    return repositories.users.listWalletTransferHistory(userId, page, pageSize);
}

export async function robExperience(input: RobExperienceInput): Promise<RobExperienceResult> {
    return repositories.users.robExperience(input);
}

export async function setUserLevelRole(userId: string, level: number, role: string): Promise<void> {
    await repositories.users.setLevelRole(userId, level, role);
}
