export type CommandResourceReservationStatus = 'pending' | 'committed' | 'released';

export interface CommandResourcePolicy {
    limit: number;
    money: number;
    level: number;
}

export interface CommandResourceReservation {
    id: string;
    userId: string;
    pluginId: string;
    messageId: string;
    limitAmount: number;
    moneyAmount: number;
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
    | {kind: 'insufficient_money'; available: number; required: number}
    | {kind: 'insufficient_level'; available: number; required: number};

export function normalizeCommandResourcePolicy(input: Partial<CommandResourcePolicy>): CommandResourcePolicy {
    return {
        limit: Math.max(0, input.limit ?? 0),
        money: Math.max(0, input.money ?? 0),
        level: Math.max(0, input.level ?? 0),
    };
}

export function requiresCommandResources(policy: CommandResourcePolicy): boolean {
    return policy.limit > 0 || policy.money > 0 || policy.level > 0;
}
