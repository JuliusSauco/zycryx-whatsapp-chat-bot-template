/**
 * Resolución rápida de menciones (@JID / @LID) sin hacer fetch de red.
 *
 * El handler ya carga `participants` una vez por mensaje vía buildContext()
 * y los pasa a los plugins. Esta utilidad reusa esa lista en memoria y, si
 * por algún motivo viene vacía, cae al cache local y al cache de Baileys
 * antes de rendirse — pero nunca dispara un conn.groupMetadata() nuevo.
 */
import {groupMetaCache} from '../core/context-builder.js';
import type {ExtendedConn} from '../types/context.js';
import type {GroupParticipant} from '@whiskeysockets/baileys';
import type {ParticipantLike} from './mention-identity.js';

export {resolveMention} from './mention-identity.js';
export type {ParticipantLike, ResolvedMention} from './mention-identity.js';

/**
 * Devuelve participants sin tocar la red:
 *   1. los que ya pasó el handler (vienen de buildContext),
 *   2. cache local en memoria (groupMetaCache, TTL 5 min),
 *   3. cache de Baileys (sock.groupCache, TTL 1 h).
 * Si nada está disponible retorna [].
 */
export function getParticipantsFast(conn: Pick<ExtendedConn, 'groupCache'>, chatId: string, fromHandler?: ParticipantLike[]): ParticipantLike[] {
    if (fromHandler && fromHandler.length) return fromHandler;
    if (!chatId || !chatId.endsWith('@g.us')) return [];

    const local = groupMetaCache.get(chatId);
    if (local?.participants?.length) return local.participants as ParticipantLike[];

    const baileys = conn?.groupCache?.get?.(chatId);
    if (baileys?.participants?.length) return baileys.participants as ParticipantLike[];

    return [];
}
