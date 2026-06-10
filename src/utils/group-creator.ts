import type {GroupMetadata, GroupParticipant} from '@whiskeysockets/baileys';
import {cleanJid} from './jid.js';

type ParticipantWithAliases = GroupParticipant & {
    participantAlt?: string | null;
    phoneNumber?: string | number | null;
};

export function getParticipantIdentityJids(participant: ParticipantWithAliases | undefined): string[] {
    if (!participant) return [];
    const phoneNumber = participant.phoneNumber?.toString().replace(/[^\d]/g, '');
    return [
        participant.id,
        participant.participantAlt,
        phoneNumber ? `${phoneNumber}@s.whatsapp.net` : null,
    ].filter((jid): jid is string => Boolean(jid)).map(cleanJid);
}

export function isGroupCreator(input: {
    chatId: string;
    sender?: string | null;
    senderLid?: string | null;
    metadata?: GroupMetadata | null;
}): boolean {
    const metadata = input.metadata;
    const participants = (metadata?.participants || []) as ParticipantWithAliases[];
    const superAdmin = participants.find(participant => participant.admin === 'superadmin' || participant.isSuperAdmin);
    const fallbackOwner = input.chatId.includes('-') ? `${input.chatId.split('-')[0]}@s.whatsapp.net` : null;
    const ownerCandidates = [
        metadata?.owner,
        fallbackOwner,
        ...getParticipantIdentityJids(superAdmin),
    ].filter((jid): jid is string => Boolean(jid)).map(cleanJid);

    const senderCandidates = [input.sender, input.senderLid]
        .filter((jid): jid is string => Boolean(jid))
        .map(cleanJid);

    return senderCandidates.some(sender => ownerCandidates.includes(sender));
}

export function getGroupCreatorJids(chatId: string, metadata?: GroupMetadata | null): string[] {
    const participants = (metadata?.participants || []) as ParticipantWithAliases[];
    const superAdmin = participants.find(participant => participant.admin === 'superadmin' || participant.isSuperAdmin);
    const fallbackOwner = chatId.includes('-') ? `${chatId.split('-')[0]}@s.whatsapp.net` : null;
    return [
        metadata?.owner,
        fallbackOwner,
        ...getParticipantIdentityJids(superAdmin),
    ].filter((jid): jid is string => Boolean(jid)).map(cleanJid);
}
