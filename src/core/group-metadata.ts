import {groupMetaCache} from './context-builder.js';
import {cleanJid} from '../utils/jid.js';
import type {GroupMetadata} from '@whiskeysockets/baileys';
import type {EventConn} from './group-event-types.js';

export async function loadEventGroupMetadata(conn: EventConn, groupId: string): Promise<GroupMetadata | null> {
    const metadata = await conn.groupMetadata(groupId).catch(() => null);
    if (metadata) {
        cacheEventGroupMetadata(conn, groupId, metadata);
        return metadata;
    }

    return getCachedEventGroupMetadata(conn, groupId);
}

export async function refreshEventGroupMetadata(conn: EventConn, groupId: string): Promise<{
    metadata: GroupMetadata;
    previousMetadata: GroupMetadata | null;
}> {
    const previousMetadata = getCachedEventGroupMetadata(conn, groupId);
    const metadata = await conn.groupMetadata(groupId);
    cacheEventGroupMetadata(conn, groupId, metadata);
    return {metadata, previousMetadata};
}

export function isBotGroupAdmin(conn: EventConn, metadata: GroupMetadata): boolean {
    const botJid = cleanJid(conn.user?.id || '');
    const botLid = cleanJid(conn.user?.lid || '');

    return (metadata.participants || []).some((participant) => {
        const participantJid = cleanJid(participant.id || '');
        return (
            (participantJid === botJid || participantJid === botLid) &&
            (participant.admin === 'admin' || participant.admin === 'superadmin')
        );
    });
}

export function getCachedEventGroupMetadata(conn: EventConn, groupId: string): GroupMetadata | null {
    return groupMetaCache.get(groupId) || conn.groupCache?.get?.(groupId) || null;
}

function cacheEventGroupMetadata(conn: EventConn, groupId: string, metadata: GroupMetadata): void {
    groupMetaCache.set(groupId, metadata);
    conn.groupCache?.set?.(groupId, metadata);
}
