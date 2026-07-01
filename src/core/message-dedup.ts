import crypto from 'crypto';
import {createExpiringMap} from '../lib/ephemeral-state.js';
import type {BotMessage} from '../types/message.js';

const processedMessages = createExpiringMap<true>({ttlMs: 1});

export function isDuplicateMessage(m: BotMessage, ttlMs: number): boolean {
    const hash = crypto.createHash('md5').update(m.key.id + (m.key.remoteJid || '')).digest('hex');
    if (processedMessages.has(hash)) return true;
    processedMessages.set(hash, true, ttlMs);
    return false;
}
