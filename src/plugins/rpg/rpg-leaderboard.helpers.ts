import type {UserWallet} from '../../domain/users.js';
import {cleanJid, isLidJid, isUserJid, normalizeWhatsAppUsername} from '../../utils/jid.js';
import {resolveMention, type ParticipantLike} from '../../utils/mention.js';

export interface LeaderboardIdentity {
    label: string;
    mentionJid: string | null;
}

export function resolveLeaderboardIdentity(
    user: Pick<UserWallet, 'id' | 'username' | 'num' | 'lid'>,
    participants: ParticipantLike[] = [],
): LeaderboardIdentity {
    const id = cleanJid(user.id);
    const storedPhone = toPhoneJid(user.num);
    const canonicalPhone = isUserJid(id) ? id : null;
    const rawLid = [id, cleanJid(user.lid || '')].find(isLidJid) || null;
    const resolvedLid = rawLid ? resolveMention(rawLid, participants) : null;
    const mentionJid = storedPhone || canonicalPhone
        || (resolvedLid?.mentionJid && isMentionableJid(resolvedLid.mentionJid) ? resolvedLid.mentionJid : null)
        || rawLid;
    const username = normalizeWhatsAppUsername(user.username);
    const fallback = mentionJid && isLidJid(mentionJid)
        ? `usuario-${mentionJid.split('@')[0].slice(-4)}`
        : mentionJid?.split('@')[0] || 'usuario';
    return {label: username || fallback, mentionJid};
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
    if (isUserJid(cleaned)) return cleaned;
    const phone = cleaned.replace(/\D/g, '');
    return /^\d{8,15}$/.test(phone) ? `${phone}@s.whatsapp.net` : null;
}

function isMentionableJid(value: string): boolean {
    return isUserJid(value) || isLidJid(value);
}
