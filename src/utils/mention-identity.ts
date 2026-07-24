import type {GroupParticipant} from '@whiskeysockets/baileys';
import {cleanJid} from './jid.js';

export type ResolvedMention = {tag: string; mentionJid: string};
export type ParticipantLike = GroupParticipant & {
    participantAlt?: string;
    phoneNumber?: string | number;
};

const JID_PHONE_REGEX = /^\d+@s\.whatsapp\.net$/;

export function resolveMention(rawJid: string, participants: ParticipantLike[] = []): ResolvedMention {
    const jid = cleanJid(rawJid || '');

    if (JID_PHONE_REGEX.test(jid)) {
        return {tag: `@${jid.split('@')[0]}`, mentionJid: jid};
    }

    if (jid.endsWith('@lid')) {
        const participant = participants.find(value => cleanJid(value.id || '') === jid);
        if (participant) {
            const participantAlt = cleanJid(participant.participantAlt || '');
            const participantPhone = (participant.phoneNumber || '').toString().replace(/[^\d]/g, '');

            if (JID_PHONE_REGEX.test(participantAlt)) {
                return {tag: `@${participantAlt.split('@')[0]}`, mentionJid: participantAlt};
            }
            if (participantPhone) {
                return {tag: `@${participantPhone}`, mentionJid: `${participantPhone}@s.whatsapp.net`};
            }
        }
    }

    const fallback = jid.split('@')[0].replace(/[^\d]/g, '');
    return {tag: fallback ? `@${fallback}` : '@usuario', mentionJid: jid || rawJid};
}
