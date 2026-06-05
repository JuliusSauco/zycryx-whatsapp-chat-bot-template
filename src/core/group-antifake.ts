import {isBlockedPhoneNumber} from '../utils/constants.js';
import type {EventConn} from './group-event-types.js';

interface GroupAntifakeInput {
    conn: EventConn;
    groupId: string;
    participantJid: string;
    userJid: string;
    userTag: string;
    enabled?: boolean;
    isBotAdmin: boolean;
}

export async function handleGroupAntifake(input: GroupAntifakeInput): Promise<boolean> {
    const {conn, groupId, participantJid, userJid, userTag, enabled, isBotAdmin} = input;
    if (!enabled) return false;

    const phoneNumber = userJid.split('@')[0];
    if (!isBlockedPhoneNumber(phoneNumber)) return false;

    if (isBotAdmin) {
        await conn.sendMessage(groupId, {
            text: `⚠️ ${userTag} fue eliminado automáticamente por *número no permitido*`,
            mentions: [userJid]
        });
        await conn.groupParticipantsUpdate(groupId, [participantJid], 'remove');
    }

    return true;
}
