import {cleanJid} from '../utils/jid.js';
import type {EventConn} from './group-event-types.js';
import {configuredOwners} from './config.js';
import {requireBotInstanceIdentity} from './bot-instance-identity.js';

export function getCurrentBotJid(conn: EventConn): string {
    return cleanJid(conn.user?.id || '');
}

export function getCurrentBotInstanceId(conn: EventConn): string {
    return requireBotInstanceIdentity(conn).instanceId;
}

export function isCurrentBotCreator(conn: EventConn): boolean {
    const botJid = getCurrentBotJid(conn);
    return configuredOwners
        .map(([owner]) => owner.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        .includes(botJid);
}
