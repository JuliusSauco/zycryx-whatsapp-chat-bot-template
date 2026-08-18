import {acquireRedisLock, releaseRedisLock} from './redis-runtime.js';

interface RequestEntry<TPayload> {
    payload: TPayload;
    redisToken: string | null;
    timer: ReturnType<typeof setTimeout>;
}

export interface UserRequestLocks<TPayload = true> {
    acquire(userId: string, payload?: TPayload): Promise<boolean>;
    get(userId: string): TPayload | undefined;
    setPayload(userId: string, payload: TPayload): void;
    has(userId: string): boolean;
    release(userId: string): Promise<void>;
}

const DEFAULT_TTL_MS = 15 * 60_000;

export function createUserRequestLocks<TPayload = true>(scope = 'legacy'): UserRequestLocks<TPayload> {
    const requests = new Map<string, RequestEntry<TPayload>>();

    async function release(userId: string): Promise<void> {
        const entry = requests.get(userId);
        if (!entry) return;
        requests.delete(userId);
        clearTimeout(entry.timer);
        if (entry.redisToken) await releaseRedisLock('lock:user-request', `${scope}:${userId}`, entry.redisToken);
    }

    return {
        async acquire(userId, payload = true as TPayload) {
            if (requests.has(userId)) return false;
            const distributed = await acquireRedisLock('lock:user-request', `${scope}:${userId}`, DEFAULT_TTL_MS);
            if (distributed.available && !distributed.acquired) return false;
            const timer = setTimeout(() => { void release(userId); }, DEFAULT_TTL_MS);
            timer.unref?.();
            requests.set(userId, {
                payload,
                redisToken: distributed.acquired ? distributed.token : null,
                timer,
            });
            return true;
        },
        get(userId) {
            return requests.get(userId)?.payload;
        },
        setPayload(userId, payload) {
            const entry = requests.get(userId);
            if (entry) entry.payload = payload;
        },
        has(userId) {
            return requests.has(userId);
        },
        release,
    };
}
