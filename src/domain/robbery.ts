import {randomInt} from '../utils/random.js';
import {getSecurityRemainingFactor} from './store.js';
import type {WalletResource} from './users.js';

export const ROB_EXP_PER_LEVEL = 1000;
export const ROB_DAILY_LIMIT = 4;
export const ROB_COOLDOWN_STEP_MS = 60 * 60 * 1000;
export const ROB_TIME_ZONE = 'America/Bogota';
export const MAX_ROB_EXP_AMOUNT = 2_000_000_000;
export const BANK_ROBBERY_FACTOR = 0.5;
export type RobberyResource = Exclude<WalletResource, 'zyxcoin'>;
export type RobberyAccount = 'wallet' | 'bank';

export interface RobExperienceInput {
    robberId: string;
    victimId: string;
    /** Si se omite, se elige una cantidad aleatoria hasta el maximo del nivel. */
    amount?: number;
    attemptedAt: number;
    resource?: RobberyResource;
    account?: RobberyAccount;
}

export type RobExperienceResult =
    | {
        kind: 'success';
        amount: number;
        availableLevel: number;
        maxAmount: number;
        remainingRobberies: number;
        nextAvailableAt: number;
        dailyLimitReached: boolean;
        resource: RobberyResource;
        account: RobberyAccount;
        attemptedAmount: number;
        blockedAmount: number;
    }
    | {kind: 'security_blocked'; resource: RobberyResource; account: RobberyAccount; attemptedAmount: number; remainingRobberies: number; nextAvailableAt: number}
    | {kind: 'missing_robber'}
    | {kind: 'missing_victim'}
    | {kind: 'same_user'}
    | {kind: 'invalid_amount' | 'unsupported_resource' | 'missing_account'}
    | {kind: 'cooldown'; remainingMs: number}
    | {kind: 'daily_limit'; remainingMs: number; nextAvailableAt: number}
    | {kind: 'insufficient_level'; availableLevel: number; requiredLevel: number; maxAmount: number}
    | {kind: 'insufficient_victim_exp'; available: number; required: number};

export interface RobProgressState {
    lastRobAt: number;
    dailyCount: number;
    dayKey: string | null;
}

export type RobProgressDecision =
    | {kind: 'allowed'; dailyCount: number; dayKey: string}
    | {kind: 'cooldown'; remainingMs: number}
    | {kind: 'daily_limit'; remainingMs: number; nextAvailableAt: number};

const robDayFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ROB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function datePartsAt(timestamp: number): {year: number; month: number; day: number} {
    const parts = robDayFormatter.formatToParts(new Date(timestamp));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? 0);
    return {year: value('year'), month: value('month'), day: value('day')};
}

function normalizeDailyCount(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(ROB_DAILY_LIMIT, Math.max(0, Math.floor(value)));
}

export function getRobDayKey(timestamp: number): string {
    const {year, month, day} = datePartsAt(timestamp);
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** America/Bogota usa UTC-5; la conversion explicita evita depender de la zona horaria del servidor. */
export function getNextRobDayStart(timestamp: number): number {
    const {year, month, day} = datePartsAt(timestamp);
    return Date.UTC(year, month - 1, day + 1, 5, 0, 0, 0);
}

export function getRobCooldownMs(dailyCount: number): number {
    return normalizeDailyCount(dailyCount) * ROB_COOLDOWN_STEP_MS;
}

export function evaluateRobProgress(state: RobProgressState, attemptedAt: number): RobProgressDecision {
    const storedCount = normalizeDailyCount(state.dailyCount);
    const attemptedDayKey = getRobDayKey(attemptedAt);
    const isSameDay = state.dayKey === attemptedDayKey;
    const currentDailyCount = isSameDay ? storedCount : 0;
    const cooldownEndsAt = storedCount > 0
        ? Math.max(0, state.lastRobAt) + getRobCooldownMs(storedCount)
        : 0;

    if (currentDailyCount >= ROB_DAILY_LIMIT) {
        const nextAvailableAt = Math.max(getNextRobDayStart(attemptedAt), cooldownEndsAt);
        return {
            kind: 'daily_limit',
            remainingMs: Math.max(0, nextAvailableAt - attemptedAt),
            nextAvailableAt,
        };
    }

    if (cooldownEndsAt > attemptedAt) {
        return {kind: 'cooldown', remainingMs: cooldownEndsAt - attemptedAt};
    }

    return {kind: 'allowed', dailyCount: currentDailyCount, dayKey: attemptedDayKey};
}

export function getNextRobAvailability(successAt: number, dailyCount: number): number {
    const cooldownEndsAt = successAt + getRobCooldownMs(dailyCount);
    return dailyCount >= ROB_DAILY_LIMIT
        ? Math.max(getNextRobDayStart(successAt), cooldownEndsAt)
        : cooldownEndsAt;
}

export function getMaxRobExp(level: number): number {
    if (!Number.isFinite(level) || level <= 0) return 0;
    return Math.min(MAX_ROB_EXP_AMOUNT, Math.floor(level) * ROB_EXP_PER_LEVEL);
}

export function getMaxRobAmount(level: number, valueInExp: number): number {
    if (!Number.isFinite(level) || level <= 0 || !Number.isSafeInteger(valueInExp) || valueInExp <= 0) return 0;
    return Math.min(MAX_ROB_EXP_AMOUNT, Math.floor(Math.floor(level) * ROB_EXP_PER_LEVEL / valueInExp));
}

export function getRequiredRobLevelForResource(amount: number, valueInExp: number): number {
    if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(valueInExp) || valueInExp <= 0) return 0;
    const expValue = amount * valueInExp;
    if (!Number.isSafeInteger(expValue) || expValue > MAX_ROB_EXP_AMOUNT) return 0;
    return Math.ceil(expValue / ROB_EXP_PER_LEVEL);
}

export function getRandomRobAmount(level: number, valueInExp: number): number {
    const maxAmount = getMaxRobAmount(level, valueInExp);
    return maxAmount > 0 ? randomInt(1, maxAmount) : 0;
}

export function applyRobberyProtection(
    amount: number,
    securityTier: number,
    account: RobberyAccount,
    randomValue = Math.random(),
): number {
    const accountFactor = account === 'bank' ? BANK_ROBBERY_FACTOR : 1;
    const expected = amount * accountFactor * getSecurityRemainingFactor(securityTier);
    const whole = Math.floor(expected);
    const fraction = expected - whole;
    return whole + (randomValue < fraction ? 1 : 0);
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
