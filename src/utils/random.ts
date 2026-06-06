export function pickRandom<T>(list: readonly T[]): T {
    return list[Math.floor(Math.random() * list.length)];
}

export function randomInt(maxExclusive: number): number;
export function randomInt(minInclusive: number, maxInclusive: number): number;
export function randomInt(minOrMax: number, maxInclusive?: number): number {
    if (maxInclusive === undefined) {
        return Math.floor(Math.random() * minOrMax);
    }

    return Math.floor(Math.random() * (maxInclusive - minOrMax + 1)) + minOrMax;
}

export function randomChance(probability: number): boolean {
    return Math.random() < probability;
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
