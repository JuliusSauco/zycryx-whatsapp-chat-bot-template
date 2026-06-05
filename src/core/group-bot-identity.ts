import {cleanJid} from '../utils/jid.js';
import type {EventConn} from './group-event-types.js';

export function getCurrentBotJid(conn: EventConn): string {
    return cleanJid(conn.user?.id || '');
}

export function isCurrentBotCreator(conn: EventConn): boolean {
    const botJid = getCurrentBotJid(conn);
    return global.owner
        .map(([owner]) => owner.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        .includes(botJid);
}
