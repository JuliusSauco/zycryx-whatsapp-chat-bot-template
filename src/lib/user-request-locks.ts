export interface UserRequestLocks<TPayload = true> {
    acquire(userId: string, payload?: TPayload): boolean;
    get(userId: string): TPayload | undefined;
    has(userId: string): boolean;
    release(userId: string): void;
}

export function createUserRequestLocks<TPayload = true>(): UserRequestLocks<TPayload> {
    const requests = new Map<string, TPayload>();

    return {
        acquire(userId, payload = true as TPayload) {
            if (requests.has(userId)) return false;
            requests.set(userId, payload);
            return true;
        },
        get(userId) {
            return requests.get(userId);
        },
        has(userId) {
            return requests.has(userId);
        },
        release(userId) {
            requests.delete(userId);
        },
    };
}
