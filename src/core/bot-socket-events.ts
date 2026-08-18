import type {WAMessage, WASocket} from '@whiskeysockets/baileys';
import {BaileysMessageCache} from '../lib/baileys-message-cache.js';
import {logError} from '../lib/logger.js';
import {isOtherBotKey} from '../utils/message-filter.js';
import {callUpdate, groupJoinRequest, groupsUpdate, messageUpdate, participantsUpdate} from './handler.js';
import {registerContactUserSync} from './contact-user-sync.js';
import {enqueueBotMessage} from './message-dispatch.js';
import {groupMetadataCache} from './group-metadata-cache.js';

type SocketWithGroupCache = WASocket & {groupCache?: typeof groupMetadataCache};
const activeEvents = new Set<Promise<void>>();

export function registerBotSocketEvents(input: {
    socket: SocketWithGroupCache;
    messageCache: BaileysMessageCache;
    acceptMessage: (message: WAMessage) => boolean;
    includeJoinRequests?: boolean;
    label: string;
}): void {
    const {socket, messageCache, label} = input;
    socket.groupCache = groupMetadataCache;
    registerContactUserSync(socket);

    socket.ev.on('messages.upsert', ({messages, type}) => {
        if (type !== 'notify') return;
        for (const message of messages) {
            if (!message.message) continue;
            messageCache.set(message.key, message.message);
            if (!input.acceptMessage(message) || isOtherBotKey(message.key.id)) continue;
            enqueueBotMessage(socket, message);
        }
    });

    socket.ev.on('messages.update', updates => {
        void runEvent(`${label}:messages-update`, async () => {
            await Promise.all(updates.map(update => messageUpdate(update)));
        });
    });

    socket.ev.on('call', calls => {
        void runEvent(`${label}:call`, async () => {
            for (const call of calls) await callUpdate(socket, call);
        });
    });

    socket.ev.on('group-participants.update', update => {
        void runEvent(`${label}:group-participants`, () => participantsUpdate(socket, update));
    });

    socket.ev.on('groups.update', updates => {
        void runEvent(`${label}:groups`, async () => {
            for (const update of updates) {
                if (update.id) await groupsUpdate(socket, {...update, id: update.id});
            }
        });
    });

    if (input.includeJoinRequests) {
        socket.ev.on('group.join-request', request => {
            void runEvent(`${label}:group-join-request`, () => groupJoinRequest(socket, request));
        });
    }
}

async function runEvent(label: string, task: () => Promise<void>): Promise<void> {
    const running = task().catch(error => logError(`[SOCKET EVENT] ${label}:`, error));
    activeEvents.add(running);
    try { await running; } finally { activeEvents.delete(running); }
}

export async function drainBotSocketEvents(timeoutMs: number): Promise<boolean> {
    const snapshot = [...activeEvents];
    if (!snapshot.length) return true;
    let timer: NodeJS.Timeout | undefined;
    const result = await Promise.race([
        Promise.allSettled(snapshot).then(() => true),
        new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); }),
    ]);
    if (timer) clearTimeout(timer);
    return result;
}
