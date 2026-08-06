import {logError} from '../../lib/logger.js';
import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {getNumberByLid, getUserById} from '../../services/user.service.js';
import {addWalletResource} from '../../services/wallet.service.js';
import type {WalletResource} from '../../domain/users.js';

const MAX_RESOURCE_CHANGE = 1_000_000_000;

interface AdjustmentDefinition {
    help: string;
    commands: string[];
    resource: Extract<WalletResource, 'limite' | 'exp'>;
    direction: 1 | -1;
    operation: string;
    successKey: string;
}

export function createWalletAdjustmentPlugin(definition: AdjustmentDefinition) {
    return defineSdkPlugin({
        help: [definition.help],
        tags: ['owner'],
        command: definition.commands,
        owner: true,
        register: true,
        async execute(m, {args, sdk}) {
            if (!sdk.isOwner) return;
            const target = m.isGroup ? m.mentionedJid?.[0] : m.chat;
            if (!target) return sdk.reply.message('economy.adminAdd.missingTarget');
            let resolvedTarget = target;
            if (resolvedTarget.includes('@lid')) {
                const number = await getNumberByLid(resolvedTarget);
                if (!number) return sdk.reply.message('economy.adminAdd.lidNotFound');
                resolvedTarget = `${number}@s.whatsapp.net`;
            }
            const userId = `${resolvedTarget.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
            const amount = parseResourceAmount(args);
            if (amount === null) return sdk.reply.message('economy.adminAdd.invalidAmount');
            try {
                if (!await getUserById(userId)) return sdk.reply.message('economy.adminAdd.userNotFound');
                await addWalletResource(
                    userId,
                    definition.resource,
                    definition.direction * amount,
                    'admin_adjustment',
                    definition.operation,
                );
                return sdk.reply.message(definition.successKey, {amount});
            } catch (error: unknown) {
                logError(error);
                return sdk.reply.message('economy.adminAdd.error');
            }
        },
    });
}

/** Lee una cantidad separada para no confundir el número de la mención con el valor. */
export function parseResourceAmount(args: readonly string[]): number | null {
    const value = [...args].reverse().find(arg => /^\+?\d+$/.test(arg));
    if (!value) return null;
    const amount = Number(value);
    return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_RESOURCE_CHANGE ? amount : null;
}
