import {randomInt} from '../utils/random.js';

export const ROB_EXP_PER_LEVEL = 1000;
export const ROB_COOLDOWN_MS = 25 * 60 * 1000;
export const MAX_ROB_EXP_AMOUNT = 2_000_000_000;

export interface RobExperienceInput {
    robberId: string;
    victimId: string;
    /** Si se omite, se elige una cantidad aleatoria hasta el maximo del nivel. */
    amount?: number;
    attemptedAt: number;
    cooldownMs?: number;
}

export type RobExperienceResult =
    | {kind: 'success'; amount: number; maxAmount: number}
    | {kind: 'missing_robber'}
    | {kind: 'missing_victim'}
    | {kind: 'same_user'}
    | {kind: 'invalid_amount'}
    | {kind: 'cooldown'; remainingMs: number}
    | {kind: 'insufficient_level'; availableLevel: number; requiredLevel: number; maxAmount: number}
    | {kind: 'insufficient_victim_exp'; available: number; required: number};

export function getMaxRobExp(level: number): number {
    if (!Number.isFinite(level) || level <= 0) return 0;
    return Math.min(MAX_ROB_EXP_AMOUNT, Math.floor(level) * ROB_EXP_PER_LEVEL);
}

export function getRequiredRobLevel(amount: number): number {
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_ROB_EXP_AMOUNT) return 0;
    return Math.ceil(amount / ROB_EXP_PER_LEVEL);
}

export function getRandomRobExp(level: number): number {
    const maxAmount = getMaxRobExp(level);
    return maxAmount > 0 ? randomInt(1, maxAmount) : 0;
}

export function isValidRobAmount(amount: number): boolean {
    return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_ROB_EXP_AMOUNT;
}
