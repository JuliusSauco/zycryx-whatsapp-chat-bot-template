export const DAILY_EXP_STEP = 1_000;
export const DAILY_BONUS_INTERVAL = 10;
export const DAILY_BONUS_EXP = 10_000;
export const DAILY_BONUS_LIMIT = 10;
export const DAILY_BONUS_COINS = 5_000;

export interface DailyReward {
    baseExp: number;
    bonusExp: number;
    limits: number;
    coins: number;
    nextBaseExp: number;
    hasBonus: boolean;
}

export function calculateDailyReward(streak: number): DailyReward {
    const safeStreak = Math.max(1, Math.trunc(streak));
    const hasBonus = safeStreak % DAILY_BONUS_INTERVAL === 0;
    return {
        baseExp: safeStreak * DAILY_EXP_STEP,
        bonusExp: hasBonus ? DAILY_BONUS_EXP : 0,
        limits: hasBonus ? DAILY_BONUS_LIMIT : 0,
        coins: hasBonus ? DAILY_BONUS_COINS : 0,
        nextBaseExp: (safeStreak + 1) * DAILY_EXP_STEP,
        hasBonus,
    };
}
