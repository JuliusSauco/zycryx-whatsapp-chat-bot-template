import type {WalletResource} from './users.js';

export const SECURITY_PRODUCT_CODE = 'security';
export const RAFFLE_TICKET_PRODUCT_CODE = 'raffle-ticket';
export const SECURITY_DAILY_COINS_PER_LEVEL = 10;
export const SECURITY_MAX_LEVEL = 100;
export const SUBSCRIPTION_PERIOD_MS = 24 * 60 * 60 * 1000;
export const RAFFLE_TICKET_COINS = 100;
export const RAFFLE_TICKET_LIMITS = 10;
export const RAFFLE_PAGE_SIZE = 20;
export const MAX_RAFFLE_TICKETS_PER_USER = 5;
export const MAX_RAFFLE_TICKETS_PER_PURCHASE = MAX_RAFFLE_TICKETS_PER_USER;

export type StoreProductCategory = 'upgrade' | 'ticket' | 'item' | 'character';
export type SubscriptionStatus = 'active' | 'inactive';
export type TicketPaymentResource = 'coins' | 'limite';

export interface EconomicResourceDefinition {
    code: WalletResource;
    displayName: string;
    pluralName: string;
    emoji: string;
    valueInExp: number;
    robberyEnabled: boolean;
    securityEligible: boolean;
    walletEnabled: boolean;
    bankEnabled: boolean;
}

export interface SecuritySubscription {
    userId: string;
    tier: number;
    status: SubscriptionStatus;
    dailyPriceCoins: number;
    paidUntil: Date;
    nextChargeAt: Date;
}

export interface SecurityOverview {
    level: number;
    subscription: SecuritySubscription | null;
}

export type BuySecurityResult =
    | {kind: 'success'; subscription: SecuritySubscription; walletCoins: number}
    | {kind: 'missing_user' | 'level_too_low' | 'insufficient_coins'};

export type BuyRaffleTicketsResult =
    | {kind: 'success'; quantity: number; paymentResource: TicketPaymentResource; total: number; codes: string[]}
    | {kind: 'missing_user' | 'invalid_quantity' | 'insufficient_funds'};

export interface RaffleTicketListItem {
    buyerId: string;
    buyerName: string | null;
    quantity: number;
}

export interface RaffleTicketPage {
    items: RaffleTicketListItem[];
    page: number;
    totalItems: number;
    totalPages: number;
}

export type DrawRaffleResult =
    | {kind: 'success'; title: string; ticketCode: string; winnerId: string; winnerName: string | null; totalEntries: number}
    | {kind: 'empty'}
    | {kind: 'invalid_title'};

export function normalizeSecurityTier(level: number): number {
    if (!Number.isFinite(level)) return 0;
    return Math.min(SECURITY_MAX_LEVEL, Math.max(0, Math.floor(level)));
}

export function getSecurityDailyPrice(level: number): number {
    return normalizeSecurityTier(level) * SECURITY_DAILY_COINS_PER_LEVEL;
}

/** Conserva 90 % de capacidad en nivel 1 y llega linealmente a 0 % en nivel 100. */
export function getSecurityRemainingFactor(tier: number): number {
    const normalized = normalizeSecurityTier(tier);
    if (normalized <= 0) return 1;
    return 0.9 * (SECURITY_MAX_LEVEL - normalized) / (SECURITY_MAX_LEVEL - 1);
}

export function getSecurityPreviewLevels(level: number): number[] {
    const normalized = normalizeSecurityTier(level);
    const first = normalized === 0 ? 1 : normalized + 1;
    return Array.from({length: 5}, (_, index) => first + index)
        .filter(item => item <= SECURITY_MAX_LEVEL);
}

export function raffleTicketUnitPrice(resource: TicketPaymentResource): number {
    return resource === 'coins' ? RAFFLE_TICKET_COINS : RAFFLE_TICKET_LIMITS;
}
