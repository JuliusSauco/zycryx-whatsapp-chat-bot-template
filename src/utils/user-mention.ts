import {cleanJid, isLidJid, isUserJid, normalizeWhatsAppUsername} from './jid.js';
import {resolveMention, type ParticipantLike} from './mention.js';

export interface UserMentionSource {
    id: string;
    username?: string | null;
    num?: string | null;
    lid?: string | null;
    aliases?: Array<string | null | undefined>;
}

export interface ResolvedUserMention {
    label: string;
    tag: string;
    mentionJid: string | null;
}

/**
 * Separa el texto visible de una mención de la identidad que WhatsApp etiqueta.
 * El username almacenado se usa como etiqueta y el phone JID/LID real se conserva
 * en contextInfo. Nunca convierte un LID en un número de teléfono ficticio.
 */
export function resolveUserMention(
    source: UserMentionSource,
    participants: ParticipantLike[] = [],
): ResolvedUserMention {
    const aliases = [source.id, source.num, source.lid, ...(source.aliases ?? [])]
        .map(value => cleanJid(value || ''))
        .filter(Boolean);
    const phoneJid = aliases.map(toPhoneJid).find((jid): jid is string => !!jid) ?? null;
    const lid = aliases.find(isLidJid) ?? null;
    const resolvedLid = lid ? resolveMention(lid, participants).mentionJid : null;
    const mentionJid = phoneJid
        ?? (resolvedLid && isMentionableJid(resolvedLid) ? cleanJid(resolvedLid) : null)
        ?? lid;
    const username = normalizeWhatsAppUsername(source.username);
    const fallback = mentionJid && isLidJid(mentionJid)
        ? `usuario-${mentionJid.split('@')[0].slice(-4)}`
        : mentionJid?.split('@')[0] || 'usuario';
    const label = username || fallback;
    return {label, tag: `@${label}`, mentionJid};
}

function toPhoneJid(value: string): string | null {
    if (isUserJid(value)) return value;
    if (isLidJid(value)) return null;
    const phone = value.replace(/\D/g, '');
    return /^\d{8,15}$/.test(phone) ? `${phone}@s.whatsapp.net` : null;
}

function isMentionableJid(value: string): boolean {
    return isUserJid(value) || isLidJid(value);
}
