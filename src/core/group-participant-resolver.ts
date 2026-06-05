import {resolveMention} from '../utils/mention.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';
import type {ParticipantUpdateItem} from './group-event-types.js';

export interface ResolvedGroupParticipant {
    participantJid: string;
    userJid: string;
    userTag: string;
}

export interface ResolvedGroupAuthor {
    authorJid: string;
    authorTag: string;
}

export function resolveGroupParticipant(rawParticipant: ParticipantUpdateItem, participants: GroupParticipant[]): ResolvedGroupParticipant | null {
    const {participantJid, phoneJid} = normalizeParticipant(rawParticipant);
    if (!participantJid || !participantJid.includes('@')) return null;

    if (phoneJid && /^\d+@s\.whatsapp\.net$/.test(phoneJid)) {
        return {
            participantJid,
            userJid: phoneJid,
            userTag: `@${phoneJid.split('@')[0]}`,
        };
    }

    const resolved = resolveMention(participantJid, participants);
    return {
        participantJid,
        userJid: resolved.mentionJid,
        userTag: resolved.tag,
    };
}

export function resolveGroupAuthor(author: string | {id?: string} | null | undefined, participants: GroupParticipant[]): ResolvedGroupAuthor {
    const authorJid = typeof author === 'string'
        ? author
        : (author && typeof author === 'object' ? String(author.id || '') : '');
    const resolved = authorJid ? resolveMention(authorJid, participants) : null;

    return {
        authorJid: resolved ? resolved.mentionJid : authorJid,
        authorTag: resolved ? resolved.tag : 'alguien',
    };
}

export function resolveJoinRequestParticipant(participantJid: string, participants: GroupParticipant[]): ResolvedGroupParticipant {
    const resolved = resolveMention(participantJid, participants);
    return {
        participantJid,
        userJid: resolved.mentionJid || participantJid,
        userTag: resolved.tag || `@${participantJid.split('@')[0]}`,
    };
}

function normalizeParticipant(rawParticipant: ParticipantUpdateItem): {participantJid: string; phoneJid: string | null} {
    if (typeof rawParticipant === 'string') {
        return {participantJid: rawParticipant, phoneJid: null};
    }

    return {
        participantJid: String(rawParticipant?.id || ''),
        phoneJid: rawParticipant?.phoneNumber ? String(rawParticipant.phoneNumber) : null,
    };
}
