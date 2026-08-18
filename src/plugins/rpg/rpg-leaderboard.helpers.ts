import type {UserWallet} from '../../domain/users.js';
import {cleanJid, isLidJid} from '../../utils/jid.js';
import type {ParticipantLike} from '../../utils/mention.js';
import {resolveUserMention} from '../../utils/user-mention.js';

export interface LeaderboardIdentity {
    label: string;
    mentionJid: string | null;
}

export function resolveLeaderboardIdentity(
    user: Pick<UserWallet, 'id' | 'username' | 'num' | 'lid'>,
    participants: ParticipantLike[] = [],
): LeaderboardIdentity {
    const {label, mentionJid} = resolveUserMention(user, participants);
    return {label, mentionJid};
}

export function findLeaderboardPosition(
    users: Array<Pick<UserWallet, 'id' | 'num' | 'lid'>>,
    currentIdentities: Array<string | null | undefined>,
): number {
    const current = new Set(currentIdentities.flatMap(identityAliases));
    const index = users.findIndex(user => identityAliases(user.id)
        .concat(identityAliases(user.num), identityAliases(user.lid))
        .some(identity => current.has(identity)));
    return index + 1;
}

function identityAliases(value: string | null | undefined): string[] {
    const jid = cleanJid(value || '');
    if (!jid) return [];
    const phoneJid = toPhoneJid(jid);
    return [...new Set([jid, phoneJid].filter((identity): identity is string => !!identity))];
}

function toPhoneJid(value: string | null | undefined): string | null {
    const cleaned = cleanJid(value || '');
    if (cleaned.endsWith('@s.whatsapp.net')) return cleaned;
    const phone = cleaned.replace(/\D/g, '');
    return /^\d{8,15}$/.test(phone) ? `${phone}@s.whatsapp.net` : null;
}
