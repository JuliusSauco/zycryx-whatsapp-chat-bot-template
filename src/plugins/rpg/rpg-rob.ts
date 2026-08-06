import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {isValidRobAmount} from '../../domain/robbery.js';
import {robExperience} from '../../services/wallet.service.js';
import {formatDurationClockWords} from '../../utils/time.js';

export type RobAmountSelection =
    | {kind: 'info'}
    | {kind: 'automatic'}
    | {kind: 'explicit'; amount: number}
    | {kind: 'invalid'};

export default defineSdkPlugin({
    help: ['rob [cantidad] @usuario', 'rob --info', 'robar [cantidad] @usuario'],
    tags: ['rpg'],
    command: /^(robar|rob)$/i,
    register: true,
    async execute(m, {args, conn, sdk}) {
        const selection = parseRobAmount(args);
        if (selection.kind === 'info') return sdk.reply.message('rpg.rob.info');
        if (selection.kind === 'invalid') return sdk.reply.message('rpg.rob.invalidAmount');

        const victimId = m.isGroup
            ? m.mentionedJid?.[0] ?? m.quoted?.sender
            : m.chat;
        if (!victimId) return sdk.reply.message('rpg.rob.missingTarget');
        if (victimId === m.sender) return sdk.reply.message('rpg.rob.selfTarget');

        const result = await robExperience({
            robberId: m.sender,
            victimId,
            ...(selection.kind === 'explicit' ? {amount: selection.amount} : {}),
            attemptedAt: Date.now(),
        });

        switch (result.kind) {
        case 'success':
            return conn.reply(m.chat, sdk.content.renderMessage('rpg.rob.success', {
                amount: result.amount,
                user: victimId.split('@')[0],
                level: result.availableLevel,
                maximum: result.maxAmount,
                remaining: result.remainingRobberies,
                nextAvailable: formatDurationClockWords(Math.max(0, result.nextAvailableAt - Date.now())),
                maxBlockStatus: result.dailyLimitReached ? 'Sí — límite diario alcanzado' : 'No',
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
        }
    },
});

/** Distingue la cantidad del numero contenido en una mencion de WhatsApp. */
export function parseRobAmount(args: readonly string[]): RobAmountSelection {
    if (args.some(arg => arg.toLowerCase() === '--info')) return {kind: 'info'};

    const amountArgs = args.filter(arg => !arg.startsWith('@'));
    if (amountArgs.length === 0) return {kind: 'automatic'};
    if (amountArgs.length !== 1 || !/^\d+$/.test(amountArgs[0])) return {kind: 'invalid'};

    const amount = Number(amountArgs[0]);
    return isValidRobAmount(amount)
        ? {kind: 'explicit', amount}
        : {kind: 'invalid'};
}
