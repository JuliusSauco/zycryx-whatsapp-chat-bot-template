export interface ExpiringStoreOptions<T = unknown> {
    ttlMs: number;
    onExpire?: (key: string, value: T) => void | Promise<void>;
}

interface ExpiringEntry<T> {
    value: T;
    expiresAt: number;
    timer: ReturnType<typeof setTimeout>;
}

export interface ExpiringMap<T> {
    get(key: string): T | undefined;
    set(key: string, value: T, ttlMs?: number): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    remainingMs(key: string): number;
    entries(): Array<[string, T]>;
    values(): T[];
}

export interface CooldownStore {
    check(key: string): {allowed: true} | {allowed: false; remainingMs: number};
    touch(key: string): void;
    reset(key: string): void;
}

export interface PendingActionStore<T> {
    start(key: string, value: T, ttlMs?: number): void;
    get(key: string): T | undefined;
    consume(key: string): T | undefined;
    cancel(key: string): boolean;
}

export function createExpiringMap<T>(options: ExpiringStoreOptions<T>): ExpiringMap<T> {
    const entries = new Map<string, ExpiringEntry<T>>();

    function remove(key: string, emitExpire: boolean): boolean {
        const entry = entries.get(key);
        if (!entry) return false;
        clearTimeout(entry.timer);
        entries.delete(key);
        if (emitExpire && options.onExpire) {
            Promise.resolve(options.onExpire(key, entry.value)).catch(() => undefined);
        }
        return true;
    }

    function set(key: string, value: T, ttlMs = options.ttlMs): void {
        remove(key, false);
        const safeTtl = Math.max(0, ttlMs);
        const timer = setTimeout(() => {
            remove(key, true);
        }, safeTtl);
        timer.unref?.();
        entries.set(key, {
            value,
            expiresAt: Date.now() + safeTtl,
            timer,
        });
    }

    return {
        get(key) {
            return entries.get(key)?.value;
        },
        set,
        has(key) {
            return entries.has(key);
        },
        delete(key) {
            return remove(key, false);
        },
        clear() {
            for (const key of entries.keys()) remove(key, false);
        },
        size() {
            return entries.size;
        },
        remainingMs(key) {
            const entry = entries.get(key);
            if (!entry) return 0;
            return Math.max(0, entry.expiresAt - Date.now());
        },
        entries() {
            return [...entries.entries()].map(([key, entry]) => [key, entry.value]);
        },
        values() {
            return [...entries.values()].map(entry => entry.value);
        },
    };
}

export function createCooldownStore(options: {ttlMs: number}): CooldownStore {
    const store = createExpiringMap<number>({ttlMs: options.ttlMs});

    return {
        check(key) {
            const touchedAt = store.get(key);
            if (!touchedAt) return {allowed: true};
            const remainingMs = Math.max(0, touchedAt + options.ttlMs - Date.now());
            return remainingMs > 0 ? {allowed: false, remainingMs} : {allowed: true};
        },
        touch(key) {
            store.set(key, Date.now());
        },
        reset(key) {
            store.delete(key);
        },
    };
}

export function createPendingActionStore<T>(options: ExpiringStoreOptions<T>): PendingActionStore<T> {
    const store = createExpiringMap<T>(options);

    return {
        start(key, value, ttlMs) {
            store.set(key, value, ttlMs);
        },
        get(key) {
            return store.get(key);
        },
        consume(key) {
            const value = store.get(key);
            store.delete(key);
            return value;
        },
        cancel(key) {
            return store.delete(key);
        },
    };
}
