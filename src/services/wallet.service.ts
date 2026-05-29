import type {RewardTimestampField, UserWallet, WalletResource} from '../ports/repositories.js';
import {repositories} from './data-source.js';

export const WALLET_RESOURCES: WalletResource[] = ['limite', 'exp', 'money', 'banco'];

export function isWalletResource(value: string): value is WalletResource {
    return WALLET_RESOURCES.includes(value as WalletResource);
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
): Promise<number | null> {
    return repositories.users.addWalletResource(userId, resource, amount);
}

export async function addWalletResourceAndSetWait(
    userId: string,
    resource: WalletResource,
    amount: number,
    wait: number,
): Promise<number | null> {
    return repositories.users.addWalletResourceAndSetWait(userId, resource, amount, wait);
}

export async function addWalletResourcesAndSetFields(input: {
    userId: string;
    resources: Partial<Record<WalletResource, number>>;
    fields: Partial<Record<RewardTimestampField, number>>;
}): Promise<void> {
    await repositories.users.addWalletResourcesAndSetFields(input);
}

export async function exchangeWalletResources(input: {
    userId: string;
    from: WalletResource;
    to: WalletResource;
    fromAmount: number;
    toAmount: number;
}): Promise<boolean> {
    return repositories.users.exchangeWalletResources(input);
}

export async function transferWalletResource(input: {
    from: string;
    to: string;
    resource: WalletResource;
    amount: number;
}): Promise<boolean> {
    return repositories.users.transferWalletResource(input);
}

export async function setUserLevelRole(userId: string, level: number, role: string): Promise<void> {
    await repositories.users.setLevelRole(userId, level, role);
}
