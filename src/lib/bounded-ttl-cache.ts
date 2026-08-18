export class BoundedTtlCache<K, V> {
    private readonly entries = new Map<K, {value: V; expiresAt: number}>();

    constructor(private readonly options: {ttlMs: number; maxEntries: number}) {}

    get(key: K): V | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt <= Date.now()) {
            this.entries.delete(key);
            return undefined;
        }
        // Recency via insertion order.
        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry.value;
    }

    has(key: K): boolean {
        return this.get(key) !== undefined;
    }

    set(key: K, value: V, ttlMs = this.options.ttlMs): void {
        this.entries.delete(key);
        while (this.entries.size >= this.options.maxEntries) {
            const oldest = this.entries.keys().next().value as K | undefined;
            if (oldest === undefined) break;
            this.entries.delete(oldest);
        }
        this.entries.set(key, {value, expiresAt: Date.now() + Math.max(1, ttlMs)});
    }

    delete(key: K): boolean { return this.entries.delete(key); }
    clear(): void { this.entries.clear(); }
    get size(): number { return this.entries.size; }
}
