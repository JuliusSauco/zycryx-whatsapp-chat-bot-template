import {createHash} from 'node:crypto';
import type {BotMessage} from '../types/message.js';
import type {Plugin} from '../types/plugin.js';
import {
    normalizeCommandResourcePolicy,
    requiresCommandResources,
    selectCommandPayment,
    type CommandResourceDecision,
    type CommandResourceReservation,
} from '../domain/command-resources.js';
import {repositories} from './data-source.js';

const RESERVATION_TTL_MS = 30 * 60_000;

export async function checkCommandResources(sender: string, plugin: Plugin): Promise<string | null> {
    const policy = normalizeCommandResourcePolicy(plugin);
    if (!requiresCommandResources(policy)) return null;
    const resources = await repositories.users.getResources(sender);
    if (resources.level < policy.level) return insufficientLevel(policy.level, resources.level);
    if (selectCommandPayment(policy, resources)) return null;
    if (policy.alternativeCoins) return insufficientAlternatives(policy.limit, policy.alternativeCoins);
    if (resources.limite < policy.limit) return insufficientLimit();
    if (resources.coins < policy.coins) return insufficientCoins();
    return null;
}

export async function reserveCommandResources(input: {
    sender: string;
    plugin: Plugin;
    pluginId: string;
    messageId: string;
}): Promise<CommandResourceDecision> {
    const policy = normalizeCommandResourcePolicy(input.plugin);
    if (!requiresCommandResources(policy)) return {kind: 'not_required'};
    const id = createReservationId(input.sender, input.pluginId, input.messageId);
    return repositories.commandResources.reserve({
        id,
        userId: input.sender,
        pluginId: input.pluginId,
        messageId: input.messageId,
        ...policy,
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
    });
}

export async function commitCommandResources(reservation: CommandResourceReservation): Promise<void> {
    await repositories.commandResources.commit(reservation.id);
}

export async function releaseCommandResources(reservation: CommandResourceReservation, reason: string): Promise<void> {
    await repositories.commandResources.release(reservation.id, reason);
}

export async function releaseExpiredCommandResources(now = new Date()): Promise<number> {
    return repositories.commandResources.releaseExpired(now);
}

export function commandResourceDecisionMessage(decision: CommandResourceDecision): string | null {
    switch (decision.kind) {
        case 'insufficient_level': return insufficientLevel(decision.required, decision.available);
        case 'insufficient_limit': return insufficientLimit();
        case 'insufficient_coins': return insufficientCoins();
        case 'insufficient_alternatives': return insufficientAlternatives(decision.requiredLimit, decision.requiredCoins);
        default: return null;
    }
}

export function commandResourceChargeMessage(reservation: CommandResourceReservation): string | null {
    const charges: string[] = [];
    if (reservation.limitAmount) charges.push(`${reservation.limitAmount} Límite${reservation.limitAmount > 1 ? 's' : ''} 💎`);
    if (reservation.coinsAmount) charges.push(`${reservation.coinsAmount} Coins 🪙`);
    return charges.length ? `*Usado: ${charges.join(' y ')}.*` : null;
}

function createReservationId(sender: string, pluginId: string, messageId: string): string {
    return createHash('sha256').update(`${sender}\0${pluginId}\0${messageId}`).digest('hex');
}

function insufficientLimit(): string {
    return '*⚠ 𝐒𝐮𝐬 𝐝𝐢𝐚𝐦𝐚𝐧𝐭𝐞 💎 𝐬𝐞 𝐡𝐚𝐧 𝐚𝐠𝐨𝐭𝐚𝐝𝐨 𝐩𝐮𝐞𝐝𝐞 𝐜𝐨𝐦𝐩𝐫𝐚𝐫 𝐦𝐚𝐬 𝐮𝐬𝐚𝐧𝐝𝐨 𝐞𝐥 𝐜𝐨𝐦𝐚𝐧𝐝𝐨:* #buy.';
}

function insufficientCoins(): string {
    return '*NO TIENES SUFICIENTES COINS 🪙*';
}

function insufficientAlternatives(requiredLimit: number, requiredCoins: number): string {
    return [
        '*⚠️ No tienes saldo suficiente para usar este comando.*',
        '',
        '*Precio:*',
        `• ${requiredLimit} Límite${requiredLimit === 1 ? '' : 's'} 💎`,
        `• o ${requiredCoins} Coins 🪙`,
        '',
        '_Puedes consultar tus saldos con *.wallet*._',
    ].join('\n');
}

function insufficientLevel(required: number, available: number): string {
    return `*⚠️ 𝐍𝐞𝐜𝐞𝐬𝐢𝐭𝐚 𝐞𝐥 𝐧𝐢𝐯𝐞𝐥 ${required}, 𝐩𝐚𝐫𝐚 𝐩𝐨𝐝𝐞𝐫 𝐮𝐬𝐚𝐫 𝐞𝐬𝐭𝐞 𝐜𝐨𝐦𝐚𝐧𝐝𝐨, 𝐓𝐮 𝐧𝐢𝐯𝐞𝐥 𝐚𝐜𝐭𝐮𝐚𝐥 𝐞𝐬:* ${available}`;
}

/** Compatibilidad temporal: valida sin descontar. */
export async function consumeCommandResources(sender: string, plugin: Plugin, _m: BotMessage): Promise<string | null> {
    return checkCommandResources(sender, plugin);
}
