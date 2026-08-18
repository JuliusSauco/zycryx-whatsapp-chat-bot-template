import type {BaileysSessionType} from '../ports/baileys-auth.repository.js';
import {cleanJid} from '../utils/jid.js';

export interface BotInstanceIdentity {
    instanceId: string;
    sessionId: string;
    instanceType: BaileysSessionType;
    botJid: string | null;
}

const identities = new WeakMap<object, BotInstanceIdentity>();

export function registerBotInstanceIdentity(
    connection: object,
    identity: Omit<BotInstanceIdentity, 'botJid'> & {botJid?: string | null},
): BotInstanceIdentity {
    const registered: BotInstanceIdentity = {
        ...identity,
        botJid: identity.botJid ? cleanJid(identity.botJid) : null,
    };
    identities.set(connection, registered);
    return registered;
}

export function getBotInstanceIdentity(connection: object | null | undefined): BotInstanceIdentity | null {
    return connection ? identities.get(connection) ?? null : null;
}

export function requireBotInstanceIdentity(connection: object): BotInstanceIdentity {
    const identity = getBotInstanceIdentity(connection);
    if (!identity) throw new Error('La conexión no tiene una identidad canónica de bot registrada.');
    return identity;
}

export function markBotInstanceConnected(connection: object, botJid: string | null | undefined): void {
    const identity = requireBotInstanceIdentity(connection);
    identity.botJid = botJid ? cleanJid(botJid) : null;
}

export function unregisterBotInstanceIdentity(connection: object | null | undefined): void {
    if (connection) identities.delete(connection);
}
