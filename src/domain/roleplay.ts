export const SLUT_ROLE_CODE = 'slut';
export const SLUT_PRODUCT_CODE = 'role-slut';
export const SLUT_LICENSE_PRICE_COINS = 1_000;
export const ROLEPLAY_HOURLY_COINS_PER_LEVEL = 1_000;
export const ROLEPLAY_MIN_HOURLY_PRICE_COINS = 1_000;
export const ROLEPLAY_CUSTOM_PRICE_LEVEL = 10;
export const ROLEPLAY_MAX_ACTIVE_BUYERS = 5;
export const ROLEPLAY_MAX_FIXED_HOURS = 168;
export const ROLEPLAY_PERIOD_MS = 60 * 60 * 1_000;

export type RoleplaySessionStatus = 'waiting' | 'active' | 'closed';
export type RoleplayContractStatus = 'active' | 'completed' | 'cancelled' | 'insufficient_funds';
export type RoleplayContractMode = 'fixed' | 'indefinite';
export type RoleplayPricingMode = 'automatic' | 'custom';

export interface RoleplaySession {
    id: string;
    roleCode: string;
    groupId: string;
    beneficiaryId: string;
    targetId: string | null;
    hourlyPriceCoins: number;
    beneficiaryLevel: number;
    pricingMode: RoleplayPricingMode;
    offerMessage: string;
    status: RoleplaySessionStatus;
    activeBuyerCount: number;
    openedAt: Date;
    closedAt: Date | null;
}

export interface RoleplayContract {
    id: string;
    sessionId: string;
    groupId: string;
    beneficiaryId: string;
    buyerId: string;
    hourlyPriceCoins: number;
    mode: RoleplayContractMode;
    requestedHours: number | null;
    releasedHours: number;
    status: RoleplayContractStatus;
    startedAt: Date;
    nextChargeAt: Date;
    endsAt: Date | null;
}

export interface RoleplayCounterparty {
    contract: RoleplayContract;
    counterpartyId: string;
    actorRole: 'buyer' | 'beneficiary';
}

export interface RoleplayActionContext extends RoleplayCounterparty {
    actionCode: string;
}

export type OpenRoleplaySessionResult =
    | {kind: 'success'; session: RoleplaySession}
    | {kind: 'missing_user' | 'missing_entitlement' | 'session_already_open' | 'invalid_target'}
    | {kind: 'invalid_level'; level: number}
    | {kind: 'invalid_price'; minimum: number; maximum: number};

export type AcceptRoleplayResult =
    | {kind: 'success'; contract: RoleplayContract; session: RoleplaySession; walletCoins: number; prepaidCoins: number}
    | {kind: 'missing_user' | 'session_not_found' | 'session_full' | 'not_targeted_user' | 'self_contract' | 'already_active' | 'insufficient_wallet'}
    | {kind: 'invalid_hours'; maximum: number};

export type EndRoleplayResult =
    | {kind: 'success'; endedContracts: number; refundedCoins: number; sessionClosed: boolean}
    | {kind: 'not_found' | 'ambiguous'};

export type BuyRoleplayEntitlementResult =
    | {kind: 'success'; alreadyOwned: boolean; walletCoins: number}
    | {kind: 'missing_user' | 'insufficient_wallet'};

export type RoleplayBillingEvent = {
    kind: 'charged' | 'released' | 'completed' | 'insufficient_funds';
    contractId: string;
    sessionId: string;
    groupId: string;
    beneficiaryId: string;
    buyerId: string;
    hourlyPriceCoins: number;
    releasedHours: number;
};

export function maximumHourlyPriceCoins(level: number): number {
    return Math.max(0, Math.floor(level)) * ROLEPLAY_HOURLY_COINS_PER_LEVEL;
}

export function resolveRoleplayHourlyPrice(level: number, requestedPrice?: number):
    | {kind: 'success'; price: number; pricingMode: RoleplayPricingMode; maximum: number}
    | {kind: 'invalid_level'; level: number}
    | {kind: 'invalid_price'; minimum: number; maximum: number} {
    const normalizedLevel = Math.floor(level);
    if (!Number.isSafeInteger(normalizedLevel) || normalizedLevel < 1) {
        return {kind: 'invalid_level', level: normalizedLevel};
    }
    const maximum = maximumHourlyPriceCoins(normalizedLevel);
    if (requestedPrice === undefined) {
        return {kind: 'success', price: maximum, pricingMode: 'automatic', maximum};
    }
    if (normalizedLevel < ROLEPLAY_CUSTOM_PRICE_LEVEL
        || !Number.isSafeInteger(requestedPrice)
        || requestedPrice < ROLEPLAY_MIN_HOURLY_PRICE_COINS
        || requestedPrice > maximum) {
        return {kind: 'invalid_price', minimum: ROLEPLAY_MIN_HOURLY_PRICE_COINS, maximum};
    }
    return {kind: 'success', price: requestedPrice, pricingMode: 'custom', maximum};
}

export function parseRoleplayDuration(value: string | undefined):
    | {kind: 'success'; mode: RoleplayContractMode; hours: number | null}
    | {kind: 'invalid'; maximum: number} {
    if (value === undefined || value === '') return {kind: 'success', mode: 'fixed', hours: 1};
    if (value.toLowerCase() === 'i') return {kind: 'success', mode: 'indefinite', hours: null};
    const hours = Number(value);
    if (!Number.isSafeInteger(hours) || hours < 1 || hours > ROLEPLAY_MAX_FIXED_HOURS) {
        return {kind: 'invalid', maximum: ROLEPLAY_MAX_FIXED_HOURS};
    }
    return {kind: 'success', mode: 'fixed', hours};
}
