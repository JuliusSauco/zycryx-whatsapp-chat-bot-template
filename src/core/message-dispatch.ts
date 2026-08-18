import type {WAMessage, WASocket} from '@whiskeysockets/baileys';
import {handler} from './handler.js';
import {ENV} from './env.js';
import {MessageTaskQueue} from './message-task-queue.js';
import {logError, logWarn} from '../lib/logger.js';
import type {ExtendedConn} from '../types/context.js';
import type {BotMessage} from '../types/message.js';

const queue = new MessageTaskQueue({
    concurrency: ENV.MESSAGE_QUEUE_CONCURRENCY,
    perKeyLimit: ENV.MESSAGE_QUEUE_PER_CHAT_LIMIT,
    globalLimit: ENV.MESSAGE_QUEUE_GLOBAL_LIMIT,
    onError: logError,
});

export function enqueueBotMessage(sock: WASocket, msg: WAMessage): boolean {
    const botId = sock.user?.id || 'unregistered';
    const chatId = msg.key?.remoteJid || msg.key?.participant || 'unknown';
    const accepted = queue.enqueue(`${botId}\u0000${chatId}`, async () => {
        await handler(sock as unknown as ExtendedConn, msg as unknown as BotMessage);
    });
    if (!accepted) {
        const stats = queue.getStats();
        logWarn(`[QUEUE] Mensaje descartado por backpressure en ${chatId}; pending=${stats.pending}, rejected=${stats.rejected}.`);
    }
    return accepted;
}

export const getMessageQueueStats = () => queue.getStats();
export const drainMessageQueue = (timeoutMs?: number) => queue.idle(timeoutMs);
