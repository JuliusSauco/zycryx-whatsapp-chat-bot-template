import {WAMessageStubType} from '@whiskeysockets/baileys';
import {markGroupMessageDeleted} from '../services/chat.service.js';
import {getNumberByLid} from '../services/user.service.js';
import {cleanJid, isUserJid} from '../utils/jid.js';
import type {WAMessageUpdate} from '@whiskeysockets/baileys';

type UpdateKeyLike = {
    participant?: string | null;
    participantAlt?: string | null;
    remoteJid?: string | null;
    remoteJidAlt?: string | null;
    senderLid?: string | null;
};

export async function messageUpdate(update: WAMessageUpdate): Promise<void> {
    const groupId = update.key.remoteJid || '';
    const messageId = update.key.id || '';
    if (!groupId.endsWith('@g.us') || !messageId) return;
    if (update.update.messageStubType !== WAMessageStubType.REVOKE) return;

    const actor = await getMessageUpdateActor(update);
    await markGroupMessageDeleted({
        groupId,
        messageId,
        deletedBy: actor.jid,
        deletedByLid: actor.lid,
        deletedAt: new Date(),
    });
}

async function getMessageUpdateActor(update: WAMessageUpdate): Promise<{jid: string | null; lid: string | null}> {
    const updateWithKey = update.update as {key?: UpdateKeyLike};
    const keys = [updateWithKey.key, update.key as UpdateKeyLike].filter(Boolean) as UpdateKeyLike[];

    for (const key of keys) {
        const alt = cleanJid(key.participantAlt || key.remoteJidAlt || '');
        if (isUserJid(alt)) {
            return {
                jid: alt,
                lid: getCleanLid(key),
            };
        }
    }

    const lid = keys.map(getCleanLid).find(Boolean) || null;
    if (lid) {
        const number = await getNumberByLid(lid).catch(() => null);
        if (number) {
            return {
                jid: number.includes('@') ? cleanJid(number) : `${number}@s.whatsapp.net`,
                lid,
            };
        }
    }

    const raw = keys
        .map(key => cleanJid(key.participant || key.remoteJid || ''))
        .find(jid => isUserJid(jid)) || null;

    return {
        jid: raw || lid,
        lid,
    };
}

function getCleanLid(key: UpdateKeyLike): string | null {
    for (const candidate of [key.participant, key.remoteJid, key.senderLid]) {
        const lid = cleanJid(candidate || '');
        if (lid.endsWith('@lid')) return lid;
    }

    return null;
}
