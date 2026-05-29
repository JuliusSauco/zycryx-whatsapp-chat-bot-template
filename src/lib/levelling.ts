export const growth: number = Math.pow(Math.PI / Math.E, 1.618) * Math.E * .75;

export function xpRange(level: number, multiplier: number = global.multiplier || 1): {
    min: number;
    max: number;
    xp: number
} {
    if (level < 0) {
        throw new TypeError('level cannot be negative value');
    }
    level = Math.floor(level);
    const min = level === 0 ? 0 : Math.round(Math.pow(level, growth) * multiplier) + 1;
    const max = Math.round(Math.pow(++level, growth) * multiplier);
    return {
        min,
        max,
        xp: max - min,
    };
}

export function findLevel(xp: number, multiplier: number = global.multiplier || 1): number {
    if (xp === Infinity) {
        return Infinity;
    }
    if (isNaN(xp)) {
        return NaN;
    }
    if (xp <= 0) {
        return -1;
    }
    let level = 0;
    do {
        level++;
    }
    while (xpRange(level, multiplier).min <= xp);
    return --level;
}

export function canLevelUp(level: number, xp: number, multiplier: number = global.multiplier || 1): boolean {
    if (level < 0) {
        return false;
    }
    if (xp === Infinity) {
        return true;
    }
    if (isNaN(xp)) {
        return false;
    }
    if (xp <= 0) {
        return false;
    }
    return level < findLevel(xp, multiplier);
}
