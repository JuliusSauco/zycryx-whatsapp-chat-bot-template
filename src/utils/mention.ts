/**
 * Resolución rápida de menciones (@JID / @LID) sin hacer fetch de red.
 *
 * El handler ya carga `participants` una vez por mensaje vía buildContext()
 * y los pasa a los plugins. Esta utilidad reusa esa lista en memoria y, si
 * por algún motivo viene vacía, cae al cache local y al cache de Baileys
 * antes de rendirse — pero nunca dispara un conn.groupMetadata() nuevo.
 */
import {cleanJid} from './jid.js';
import {groupMetaCache} from '../core/context-builder.js';

export type ResolvedMention = {tag: string; mentionJid: string};

const JID_PHONE_REGEX = /^\d+@s\.whatsapp\.net$/;

export function resolveMention(rawJid: string, participants: any[] = []): ResolvedMention {
    const jid = cleanJid(rawJid || '');

    if (JID_PHONE_REGEX.test(jid)) {
        return {tag: `@${jid.split('@')[0]}`, mentionJid: jid};
    }

    if (jid.endsWith('@lid')) {
        const participant = participants.find((p: any) => cleanJid(p.id || '') === jid);
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

/**
 * Devuelve participants sin tocar la red:
 *   1. los que ya pasó el handler (vienen de buildContext),
 *   2. cache local en memoria (groupMetaCache, TTL 5 min),
 *   3. cache de Baileys (sock.groupCache, TTL 1 h).
 * Si nada está disponible retorna [].
 */
export function getParticipantsFast(conn: any, chatId: string, fromHandler?: any[]): any[] {
    if (fromHandler && fromHandler.length) return fromHandler;
    if (!chatId || !chatId.endsWith('@g.us')) return [];

    const local = groupMetaCache.get(chatId);
    if (local?.participants?.length) return local.participants;

    const baileys = conn?.groupCache?.get?.(chatId);
    if (baileys?.participants?.length) return baileys.participants;

    return [];
}
