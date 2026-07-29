import type {GroupMetadata, GroupParticipant} from '@whiskeysockets/baileys';
import type {SubbotConfig} from '../types/config.js';
import {getGroupCreatorJids, getParticipantIdentityJids} from './group-creator.js';
import {cleanJid} from './jid.js';
import {resolveMention} from './mention-identity.js';

type ParticipantWithAliases = GroupParticipant & {participantAlt?: string | null};

export interface CensoredTarget {
    userId: string;
    userLid: string | null;
    mentionJid: string;
    participant?: GroupParticipant;
}

export function resolveCensoredTarget(rawJid: string, participants: GroupParticipant[]): CensoredTarget {
    const normalizedRaw = cleanJid(rawJid);
    const participant = (participants as ParticipantWithAliases[]).find(item =>
        getParticipantIdentityJids(item).includes(normalizedRaw)
        || resolveMention(item.id || '', participants).mentionJid === resolveMention(normalizedRaw, participants).mentionJid,
    );
    const identities = getParticipantIdentityJids(participant);
    const resolved = resolveMention(normalizedRaw, participants).mentionJid;
    const phoneJid = identities.find(jid => jid.endsWith('@s.whatsapp.net')) || (resolved.endsWith('@s.whatsapp.net') ? resolved : normalizedRaw);
    const lid = identities.find(jid => jid.endsWith('@lid')) || (normalizedRaw.endsWith('@lid') ? normalizedRaw : null);
    return {userId: phoneJid, userLid: lid, mentionJid: resolved, participant};
}

export function isProtectedCensoredTarget(input: {
    actor: {userId: string; userLid?: string | null; isOwner: boolean; isGroupCreator: boolean; isAdmin: boolean};
    target: CensoredTarget;
    chatId: string;
    metadata: GroupMetadata;
    botConfig?: SubbotConfig;
    botJid?: string | null;
}): 'self' | 'bot' | 'owner' | 'rank' | null {
    const targetIds = targetIdentities(input.target);
    const actorIds = [input.actor.userId, input.actor.userLid].filter((value): value is string => Boolean(value)).map(cleanJid);
    if (actorIds.some(id => targetIds.includes(id))) return 'self';
    if (input.botJid && targetIds.includes(cleanJid(input.botJid))) return 'bot';
    const owners = (input.botConfig?.owners || []).map(cleanJid);
    if (targetIds.some(id => owners.includes(id))) return 'owner';

    const targetLevel = getTargetGroupLevel(input.target, input.chatId, input.metadata);
    const actorLevel = input.actor.isOwner ? 3 : input.actor.isGroupCreator ? 2 : input.actor.isAdmin ? 1 : 0;
    if (targetLevel > 0 && actorLevel <= targetLevel) return 'rank';
    return null;
}

export function isCensoredTargetCurrentlyPrivileged(input: {
    target: CensoredTarget;
    chatId: string;
    metadata: GroupMetadata;
    botConfig?: SubbotConfig;
}): boolean {
    const ids = targetIdentities(input.target);
    if ((input.botConfig?.owners || []).map(cleanJid).some(owner => ids.includes(owner))) return true;
    return getTargetGroupLevel(input.target, input.chatId, input.metadata) > 0;
}

function getTargetGroupLevel(target: CensoredTarget, chatId: string, metadata: GroupMetadata): number {
    const ids = targetIdentities(target);
    if (getGroupCreatorJids(chatId, metadata).some(jid => ids.includes(jid))) return 2;
    const participant = target.participant || metadata.participants?.find(item => getParticipantIdentityJids(item).some(jid => ids.includes(jid)));
    return participant?.admin === 'admin' || participant?.admin === 'superadmin' || participant?.isAdmin || participant?.isSuperAdmin ? 1 : 0;
}

function targetIdentities(target: CensoredTarget): string[] {
    return [...new Set([target.userId, target.userLid, target.mentionJid, ...getParticipantIdentityJids(target.participant)]
        .filter((value): value is string => Boolean(value)).map(cleanJid))];
}
