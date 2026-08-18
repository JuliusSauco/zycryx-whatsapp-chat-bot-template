import type {proto} from '@whiskeysockets/baileys';

type MessageKeyLike = {
    remoteJid?: string | null;
    id?: string | null;
};

type CachedMessage = {
    message: proto.IMessage;
    expiresAt: number;
};

export class BaileysMessageCache {
    private readonly entries = new Map<string, CachedMessage>();

    constructor(
        private readonly maxEntries = 5_000,
        private readonly ttlMs = 10 * 60_000,
    ) {}

    set(key: MessageKeyLike, message: proto.IMessage | null | undefined): void {
        const cacheKey = this.cacheKey(key);
        if (!cacheKey || !message) return;
        this.entries.delete(cacheKey);
        this.entries.set(cacheKey, {message, expiresAt: Date.now() + this.ttlMs});
        while (this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value as string | undefined;
            if (!oldest) break;
            this.entries.delete(oldest);
        }
    }

    get(key: MessageKeyLike): proto.IMessage | undefined {
        const cacheKey = this.cacheKey(key);
        if (!cacheKey) return undefined;
        const cached = this.entries.get(cacheKey);
        if (!cached) return undefined;
        if (cached.expiresAt <= Date.now()) {
            this.entries.delete(cacheKey);
            return undefined;
        }
        return cached.message;
    }

    clear(): void {
        this.entries.clear();
    }

    private cacheKey(key: MessageKeyLike): string | null {
        return key.remoteJid && key.id ? `${key.remoteJid}\u0000${key.id}` : null;
    }
}
