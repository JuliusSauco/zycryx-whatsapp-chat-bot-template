export type CommandResourceReservationStatus = 'pending' | 'committed' | 'released';

export interface CommandResourcePolicy {
    limit: number;
    coins: number;
    alternativeCoins: number;
    level: number;
}

export type CommandPaymentResource = 'limite' | 'coins' | 'mixed' | 'none';
export interface CommandPaymentSelection {
    limitAmount: number;
    coinsAmount: number;
    paymentResource: CommandPaymentResource;
}

export interface CommandResourceReservation {
    id: string;
    userId: string;
    pluginId: string;
    messageId: string;
    limitAmount: number;
    coinsAmount: number;
    alternativeCoinsAmount: number;
    paymentResource: CommandPaymentResource;
    requiredLevel: number;
    status: CommandResourceReservationStatus;
    releaseReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
}

export type CommandResourceDecision =
    | {kind: 'not_required'}
    | {kind: 'reserved'; reservation: CommandResourceReservation; duplicate: boolean}
    | {kind: 'insufficient_limit'; available: number; required: number}
    | {kind: 'insufficient_coins'; available: number; required: number}
    | {kind: 'insufficient_alternatives'; availableLimit: number; requiredLimit: number; availableCoins: number; requiredCoins: number}
    | {kind: 'insufficient_level'; available: number; required: number};

export function normalizeCommandResourcePolicy(input: Partial<CommandResourcePolicy>): CommandResourcePolicy {
    return {
        limit: Math.max(0, input.limit ?? 0),
        coins: Math.max(0, input.coins ?? 0),
        alternativeCoins: Math.max(0, input.alternativeCoins ?? 0),
        level: Math.max(0, input.level ?? 0),
    };
}

export function requiresCommandResources(policy: CommandResourcePolicy): boolean {
    return policy.limit > 0 || policy.coins > 0 || policy.alternativeCoins > 0 || policy.level > 0;
}

export function selectCommandPayment(
    policy: CommandResourcePolicy,
    available: {limite: number; coins: number},
): CommandPaymentSelection | null {
    const hasPrimaryPrice = policy.limit > 0 || policy.coins > 0;
    if (hasPrimaryPrice && available.limite >= policy.limit && available.coins >= policy.coins) {
        return {
            limitAmount: policy.limit,
            coinsAmount: policy.coins,
            paymentResource: policy.limit && policy.coins ? 'mixed' : policy.limit ? 'limite' : 'coins',
        };
    }
    if (policy.alternativeCoins > 0 && available.coins >= policy.alternativeCoins) {
        return {limitAmount: 0, coinsAmount: policy.alternativeCoins, paymentResource: 'coins'};
    }
    if (!hasPrimaryPrice && policy.alternativeCoins === 0) {
        return {limitAmount: 0, coinsAmount: 0, paymentResource: 'none'};
    }
    return null;
}
