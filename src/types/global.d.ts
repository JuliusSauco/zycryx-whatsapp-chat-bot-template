declare global {
    interface Array<T> {
        /** @deprecated Use pickRandom from src/utils/random.ts in new code. */
        getRandom(): T;
    }
}

export {};
