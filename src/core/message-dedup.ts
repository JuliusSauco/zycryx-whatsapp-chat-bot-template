import crypto from 'crypto';
import {createExpiringMap} from '../lib/ephemeral-state.js';
import type {BotMessage} from '../types/message.js';
import {acquireRedisLock} from '../lib/redis-runtime.js';

const processedMessages = createExpiringMap<true>({ttlMs: 1});

export async function isDuplicateMessage(m: BotMessage, ttlMs: number): Promise<boolean> {
    const hash = crypto.createHash('sha256').update(m.key.id + (m.key.remoteJid || '')).digest('hex');
    if (processedMessages.has(hash)) return true;
    const distributed = await acquireRedisLock('dedup:message', hash, ttlMs);
    if (distributed.available && !distributed.acquired) {
        processedMessages.set(hash, true, ttlMs);
        return true;
    }
    processedMessages.set(hash, true, ttlMs);
    return false;
}
