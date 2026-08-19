import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {isValidRobAmount, type RobberyAccount, type RobberyResource} from '../../domain/robbery.js';
import {robExperience} from '../../services/wallet.service.js';
import {listEconomicResources} from '../../services/store.service.js';
import {formatDurationClockWords} from '../../utils/time.js';

export type RobAmountSelection =
    | {kind: 'info'}
    | {kind: 'automatic'}
    | {kind: 'explicit'; amount: number}
    | {kind: 'invalid'};

export type RobRequestSelection =
    | {kind: 'info'}
    | {kind: 'rob'; account: RobberyAccount; resource: RobberyResource; amount?: number}
    | {kind: 'invalid'}
    | {kind: 'unsupported_resource'};

const ROB_INFO_ARGUMENTS = new Set(['--info', 'help', 'ayuda']);

export default defineSdkPlugin({
    help: ['rob [cantidad] @usuario', 'rob --info', 'robar [cantidad] @usuario'],
    tags: ['rpg'],
    command: /^(robar|rob)$/i,
    register: true,
    async execute(m, {args, conn, sdk}) {
        const selection = parseRobRequest(args);
        if (selection.kind === 'info') return sdk.reply.message('rpg.rob.info');
        if (selection.kind === 'invalid') return sdk.reply.message('rpg.rob.invalidAmount');
        if (selection.kind === 'unsupported_resource') return sdk.reply.message('rpg.rob.unsupportedResource');

        const victimId = m.isGroup
            ? m.mentionedJid?.[0] ?? m.quoted?.sender
            : m.chat;
        if (!victimId) return sdk.reply.message('rpg.rob.missingTarget');
        if (victimId === m.sender) return sdk.reply.message('rpg.rob.selfTarget');

        const result = await robExperience({
            robberId: m.sender,
            victimId,
            ...(selection.amount === undefined ? {} : {amount: selection.amount}),
            resource: selection.resource,
            account: selection.account,
            attemptedAt: Date.now(),
        });

        switch (result.kind) {
        case 'success': {
            const resources = await listEconomicResources();
            const resource = resources.find(item => item.code === result.resource);
            return conn.reply(m.chat, sdk.content.renderMessage('rpg.rob.success', {
                amount: result.amount,
                attempted: result.attemptedAmount,
                blocked: result.blockedAmount,
                resource: resource?.pluralName ?? result.resource,
                emoji: resource?.emoji ?? '💰',
                account: result.account === 'bank' ? 'Banco' : 'E - WALLET',
                user: victimId.split('@')[0],
                level: result.availableLevel,
                maximum: result.maxAmount,
                remaining: result.remainingRobberies,
                nextAvailable: formatDurationClockWords(Math.max(0, result.nextAvailableAt - Date.now())),
                maxBlockStatus: result.dailyLimitReached ? 'Sí — límite diario alcanzado' : 'No',
            }), m, {mentions: [victimId]});
        }
        case 'security_blocked':
            return conn.reply(m.chat, sdk.content.renderMessage('rpg.rob.securityBlocked', {
                user: victimId.split('@')[0],
                attempted: result.attemptedAmount,
                resource: result.resource,
                remaining: result.remainingRobberies,
                nextAvailable: formatDurationClockWords(Math.max(0, result.nextAvailableAt - Date.now())),
            }), m, {mentions: [victimId]});
        case 'cooldown':
            return sdk.reply.message('rpg.rob.cooldown', {
                time: formatDurationClockWords(result.remainingMs),
            });
        case 'daily_limit':
            return sdk.reply.message('rpg.rob.dailyLimit', {
                time: formatDurationClockWords(result.remainingMs),
            });
        case 'insufficient_level':
            return sdk.reply.message('rpg.rob.insufficientLevel', {
                level: result.availableLevel,
                requiredLevel: result.requiredLevel,
                maximum: result.maxAmount,
            });
        case 'insufficient_victim_exp':
            return conn.reply(m.chat, sdk.content.renderMessage('rpg.rob.poorVictim', {
                user: victimId.split('@')[0],
                available: result.available,
                required: result.required,
            }), m, {mentions: [victimId]});
        case 'missing_robber':
            return sdk.reply.message('rpg.rob.missingUser');
        case 'missing_victim':
            return sdk.reply.message('rpg.rob.missingVictim');
        case 'same_user':
            return sdk.reply.message('rpg.rob.selfTarget');
        case 'invalid_amount':
            return sdk.reply.message('rpg.rob.invalidAmount');
        case 'unsupported_resource':
            return sdk.reply.message('rpg.rob.unsupportedResource');
        case 'missing_account':
            return sdk.reply.message('rpg.rob.missingAccount');
        }
    },
});

/** Distingue la cantidad del numero contenido en una mencion de WhatsApp. */
export function parseRobAmount(args: readonly string[]): RobAmountSelection {
    if (args.some(arg => ROB_INFO_ARGUMENTS.has(arg.toLowerCase()))) return {kind: 'info'};

    const amountArgs = args.filter(arg => !arg.startsWith('@'));
    if (amountArgs.length === 0) return {kind: 'automatic'};
    if (amountArgs.length !== 1 || !/^\d+$/.test(amountArgs[0])) return {kind: 'invalid'};

    const amount = Number(amountArgs[0]);
    return isValidRobAmount(amount)
        ? {kind: 'explicit', amount}
        : {kind: 'invalid'};
}

const RESOURCE_ALIASES: Record<string, RobberyResource> = {
    exp: 'exp', xp: 'exp', experiencia: 'exp',
    coin: 'coins', coins: 'coins', moneda: 'coins', monedas: 'coins',
    limite: 'limite', limites: 'limite', diamante: 'limite', diamantes: 'limite',
    botcoin: 'botcoin', botcoins: 'botcoin',
};

export function parseRobRequest(args: readonly string[]): RobRequestSelection {
    if (args.some(arg => ROB_INFO_ARGUMENTS.has(arg.toLowerCase()))) return {kind: 'info'};
    const values = args.filter(arg => !arg.startsWith('@')).map(arg => arg.toLowerCase());
    let account: RobberyAccount = 'wallet';
    if (['wallet', 'billetera', 'cartera'].includes(values[0] ?? '')) values.shift();
    else if (['bank', 'banco'].includes(values[0] ?? '')) {
        return {kind: 'unsupported_resource'};
    }
    let resource: RobberyResource = 'exp';
    if (values[0] && !/^\d+$/.test(values[0])) {
        if (['zyxcoin', 'zyxcoins'].includes(values[0])) return {kind: 'unsupported_resource'};
        const resolved = RESOURCE_ALIASES[values[0]];
        if (!resolved) return {kind: 'unsupported_resource'};
        resource = resolved;
        values.shift();
    }
    if (values.length === 0) return {kind: 'rob', account, resource};
    if (values.length !== 1 || !/^\d+$/.test(values[0])) return {kind: 'invalid'};
    const amount = Number(values[0]);
    return Number.isSafeInteger(amount) && amount > 0
        ? {kind: 'rob', account, resource, amount}
        : {kind: 'invalid'};
}
