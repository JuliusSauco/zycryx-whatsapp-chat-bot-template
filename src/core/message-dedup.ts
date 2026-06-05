import crypto from 'crypto';
import type {BotMessage} from '../types/message.js';

const processedMessages = new Set<string>();

export function isDuplicateMessage(m: BotMessage, ttlMs: number): boolean {
    const hash = crypto.createHash('md5').update(m.key.id + (m.key.remoteJid || '')).digest('hex');
    if (processedMessages.has(hash)) return true;
    processedMessages.add(hash);
    setTimeout(() => processedMessages.delete(hash), ttlMs);
    return false;
}
