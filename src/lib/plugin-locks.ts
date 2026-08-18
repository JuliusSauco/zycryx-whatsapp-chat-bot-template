interface LockEntry {
    expiresAt: number;
    timer: ReturnType<typeof setTimeout>;
}
import {acquireRedisLock, releaseRedisLock} from './redis-runtime.js';

export interface PluginLocks {
    runExclusive<T>(key: string, operation: () => Promise<T>, ttlMs?: number): Promise<{acquired: true; value: T} | {acquired: false}>;
    isLocked(key: string): boolean;
}

const locks = new Map<string, LockEntry>();
const DEFAULT_TTL_MS = 15 * 60_000;

export function createPluginLocks(pluginId: string): PluginLocks {
    const scoped = (key: string) => `${pluginId}:${key}`;
    return {
        async runExclusive(key, operation, ttlMs = DEFAULT_TTL_MS) {
            const id = scoped(key);
            const current = locks.get(id);
            if (current && current.expiresAt > Date.now()) return {acquired: false};
            if (current) release(id);
            const safeTtl = Math.max(1_000, ttlMs);
            const timer = setTimeout(() => release(id), safeTtl);
            timer.unref?.();
            locks.set(id, {expiresAt: Date.now() + safeTtl, timer});
            const distributed = await acquireRedisLock('lock:plugin', id, safeTtl);
            if (distributed.available && !distributed.acquired) {
                release(id);
                return {acquired: false};
            }
            try {
                return {acquired: true, value: await operation()};
            } finally {
                if (distributed.acquired) await releaseRedisLock('lock:plugin', id, distributed.token);
                release(id);
            }
        },
        isLocked(key) {
            const entry = locks.get(scoped(key));
            return !!entry && entry.expiresAt > Date.now();
        },
    };
}

function release(id: string): void {
    const entry = locks.get(id);
    if (entry) clearTimeout(entry.timer);
    locks.delete(id);
}
