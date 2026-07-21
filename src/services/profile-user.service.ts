import type {GroupParticipant} from '@whiskeysockets/baileys';
import type {UserRecord} from '../domain/users.js';
import {getParticipantIdentityJids} from '../utils/group-creator.js';
import {cleanJid, isUserJid, jidToPhone} from '../utils/jid.js';
import {resolveMention} from '../utils/mention.js';
import {getUserById, upsertUser} from './user.service.js';

export interface ResolveProfileUserInput {
    rawJid: string;
    participants?: GroupParticipant[];
    aliases?: Array<string | null | undefined>;
    displayName?: string | null;
    createIfMissing?: boolean;
}

export interface ResolvedProfileUser {
    userId: string;
    mentionJid: string;
    tag: string;
    participant: GroupParticipant | null;
    user: UserRecord;
    created: boolean;
}

export async function resolveProfileUser(input: ResolveProfileUserInput): Promise<ResolvedProfileUser | null> {
    const participants = input.participants ?? [];
    const rawJid = cleanJid(input.rawJid || '');
    const participant = findParticipantByJid(participants, rawJid);
    const resolved = resolveMention(rawJid, participants);
    const participantIds = participant ? getParticipantIdentityJids(participant) : [];
    const candidates = prioritizeIdentities([
        resolved.mentionJid,
        ...participantIds,
        ...(input.aliases ?? []),
        rawJid,
    ]);

    for (const userId of candidates) {
        const user = await getUserById(userId);
        if (user) return buildResult(userId, resolved.mentionJid, participant, user, false);
    }

    if (!input.createIfMissing) return null;
    const userId = candidates.find(isUserJid) ?? candidates[0];
    if (!userId) return null;
    const lid = candidates.find(candidate => candidate.endsWith('@lid'));
    await upsertUser({
        id: userId,
        nombre: input.displayName?.trim() || 'sin name',
        num: isUserJid(userId) ? jidToPhone(userId) : null,
        lid,
    });
    const user = await getUserById(userId);
    return user ? buildResult(userId, resolved.mentionJid, participant, user, true) : null;
}

function buildResult(
    userId: string,
    resolvedMentionJid: string,
    participant: GroupParticipant | null,
    user: UserRecord,
    created: boolean,
): ResolvedProfileUser {
    const mentionJid = isUserJid(resolvedMentionJid)
        ? cleanJid(resolvedMentionJid)
        : isUserJid(userId) ? cleanJid(userId) : cleanJid(resolvedMentionJid || userId);
    const tag = isUserJid(mentionJid) ? `@${jidToPhone(mentionJid)}` : '@usuario';
    return {userId, mentionJid, tag, participant, user, created};
}

function prioritizeIdentities(values: Array<string | null | undefined>): string[] {
    const unique = [...new Set(values.filter((value): value is string => !!value).map(cleanJid).filter(Boolean))];
    return [
        ...unique.filter(isUserJid),
        ...unique.filter(value => !isUserJid(value)),
    ];
}

function findParticipantByJid(participants: GroupParticipant[], jid: string): GroupParticipant | null {
    const target = cleanJid(jid);
    return participants.find(participant =>
        getParticipantIdentityJids(participant).some(candidate => cleanJid(candidate) === target)
    ) ?? null;
}
